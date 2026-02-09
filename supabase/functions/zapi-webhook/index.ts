import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Normaliza telefone para formato brasileiro com código do país
function normalizePhoneWithCountryCode(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 12 || cleaned.length === 13) {
    if (cleaned.startsWith('55')) {
      return cleaned;
    }
  }
  
  if (cleaned.length === 10 || cleaned.length === 11) {
    return '55' + cleaned;
  }
  
  return cleaned;
}

// Verifica se a IA está ativa para uma conversa específica
function isAIActive(
  aiDisabledUntil: string | null,
  contactTags: string[] | null
): boolean {
  if (contactTags?.includes("IA Desativada")) {
    return false;
  }
  
  if (!aiDisabledUntil) {
    return true;
  }
  
  const now = new Date();
  const disabledUntil = new Date(aiDisabledUntil);
  
  return now >= disabledUntil;
}

// Mensagem de fallback quando OpenAI/sistema falha
const FALLBACK_MESSAGE = 'Desculpe! No momento estamos com instabilidade no sistema. Pode me mandar sua dúvida e um atendente humano te responde assim que possível. 🙏';

// Converte formatação Markdown (GPT) para formatação WhatsApp
function convertMarkdownToWhatsApp(text: string): string {
  return text
    // Negrito: **texto** → *texto*
    .replace(/\*\*(.+?)\*\*/g, '*$1*')
    // Itálico: _texto_ permanece igual (WhatsApp usa _)
    // Tachado: ~~texto~~ → ~texto~
    .replace(/~~(.+?)~~/g, '~$1~');
}

// Função de retry com backoff exponencial
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`⏳ Retry ${attempt + 1}/${maxRetries} após ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// Processa resposta automática da IA COM TRATAMENTO ROBUSTO DE ERROS
// Suporta routing entre sistema legado (hashtags) e novo sistema (function calling)
async function processAIResponse(params: {
  supabase: any;
  conversationId: string;
  contactId: string;
  companyId: string;
  whatsappConnectionId: string;
  inboundMessageText: string;
  phone: string;
}) {
  const { supabase, conversationId, contactId, companyId, whatsappConnectionId, inboundMessageText, phone } = params;
  
  try {
    console.log('🤖 ==================== INICIANDO AUTO-RESPOSTA DA IA ====================');
    console.log('📋 Parâmetros:', {
      conversationId,
      contactId,
      companyId,
      whatsappConnectionId,
      messagePreview: inboundMessageText.substring(0, 50)
    });

    // ==================== USAR RESPONSES API (GPT-5) ====================
    console.log('🎯 Modo: Responses API (GPT-5)');
    const agentFunction = 'chat-ai-responses';
    console.log(`📞 Chamando edge function ${agentFunction}...`);
    
    let aiResponse: any = null;
    let aiError: any = null;

    try {
      const result = await retryWithBackoff(async () => {
        const { data, error } = await supabase.functions.invoke(agentFunction, {
          body: {
            message: inboundMessageText,
            conversationId,
            contactId,
            companyId,
            senderPhone: phone
          }
        });
        if (error) throw error;
        return data;
      }, 3, 1000);
      
      aiResponse = result;
    } catch (err) {
      aiError = err;
    }

    // ==================== TRATAMENTO DE ERRO 429 (TOKEN LIMIT) ====================
    if (aiError) {
      const errorMessage = String(aiError.message || aiError || '');
      const errorStatus = aiError.status || 0;
      
      // Verificar se é erro de limite de tokens (429)
      if (errorStatus === 429 || errorMessage.includes('Token limit') || errorMessage.includes('rate limit')) {
        console.warn('⚠️ LIMITE DE TOKENS EXCEDIDO para empresa:', companyId);
        
        // Enviar mensagem amigável ao cliente
        await sendFallbackMessage(supabase, {
          conversationId,
          whatsappConnectionId,
          phone,
          message: 'Olá! No momento estamos com alta demanda. Por favor, aguarde alguns instantes e tente novamente, ou um atendente humano responderá em breve.',
          companyId,
          errorType: 'token_limit'
        });
        return;
      }
      
      // ==================== TRATAMENTO DE ERRO OPENAI FORA DO AR ====================
      if (errorMessage.includes('OpenAI') || errorMessage.includes('API') || errorMessage.includes('timeout') || errorMessage.includes('ECONNREFUSED')) {
        console.error('❌ OpenAI fora do ar ou erro de API:', aiError);
        
        await sendFallbackMessage(supabase, {
          conversationId,
          whatsappConnectionId,
          phone,
          message: FALLBACK_MESSAGE,
          companyId,
          errorType: 'openai_down'
        });
        return;
      }
      
      // Outros erros - enviar fallback
      console.error('❌ Erro ao chamar chat-ai:', aiError);
      
      await sendFallbackMessage(supabase, {
        conversationId,
        whatsappConnectionId,
        phone,
        message: FALLBACK_MESSAGE,
        companyId,
        errorType: 'unknown_ai_error'
      });
      return;
    }
    // ==================== FIM TRATAMENTO DE ERROS ====================

    console.log('✅ IA respondeu com sucesso:', {
      hasResponse: !!aiResponse?.response,
      escalated: aiResponse?.escalated,
      responsePreview: aiResponse?.response?.substring(0, 100)
    });

    // Se IA escalou para humano, apenas logar (status não muda automaticamente)
    if (aiResponse?.escalated) {
      console.log('⚠️ IA detectou solicitação de humano. Tag "Aguardando Humano" será adicionada.');
      console.log('✅ Status continua "ai" até humano assumir manualmente.');
    }

    // Enviar resposta via Z-API com retry - DIVIDIDA EM PARÁGRAFOS
    if (aiResponse?.response) {
      console.log('📤 Enviando resposta via Z-API...');
      
      try {
        // Buscar configuração de delay de parágrafos
        const { data: masterPromptConfig } = await supabase
          .from('ai_master_prompt')
          .select('paragraph_delay_seconds')
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();
        
        const baseDelay = masterPromptConfig?.paragraph_delay_seconds || 2;
        console.log(`⏱️ Delay base configurado: ${baseDelay}s (±1s)`);
        
        // Converter formatação Markdown (GPT) → WhatsApp
        const whatsappFormatted = convertMarkdownToWhatsApp(aiResponse.response);
        console.log('📝 Formatação convertida: Markdown → WhatsApp');
        
        // Dividir resposta por parágrafos (quebras duplas de linha)
        const paragraphs = whatsappFormatted
          .split(/\n\n+/)
          .map((p: string) => p.trim())
          .filter((p: string) => p.length > 0);
        
        console.log(`📝 Resposta dividida em ${paragraphs.length} parágrafo(s)`);
        
        // Enviar cada parágrafo separadamente com delay
        let paragraphsFailed = false;
        for (let i = 0; i < paragraphs.length; i++) {
          const paragraph = paragraphs[i];
          console.log(`📤 Enviando parágrafo ${i + 1}/${paragraphs.length} (${paragraph.length} chars)`);
          
          try {
            await retryWithBackoff(async () => {
              const { error: sendError } = await supabase.functions.invoke('zapi-send-message', {
                body: {
                  conversationId,
                  whatsappConnectionId,
                  phone,
                  message: paragraph,
                  mediaUrl: null
                }
              });
              if (sendError) throw sendError;
            }, 3, 1000);
          } catch (paragraphErr) {
            console.error(`❌ Falha ao enviar parágrafo ${i + 1}/${paragraphs.length} após 3 tentativas:`, paragraphErr);
            paragraphsFailed = true;
            
            // Logar erro detalhado
            await supabase.from('system_logs').insert({
              source: 'zapi-webhook',
              log_type: 'error',
              severity: 'error',
              company_id: companyId,
              message: `Falha ao enviar parágrafo ${i + 1}/${paragraphs.length}`,
              metadata: { 
                error: String(paragraphErr), 
                conversationId,
                paragraphIndex: i,
                totalParagraphs: paragraphs.length,
                paragraphPreview: paragraph.substring(0, 100)
              }
            });
            
            // Tentar enviar mensagem de fallback
            try {
              await supabase.functions.invoke('zapi-send-message', {
                body: {
                  conversationId,
                  whatsappConnectionId,
                  phone,
                  message: "Desculpe, tive um problema técnico. Pode repetir sua mensagem?",
                  mediaUrl: null
                }
              });
              console.log('✅ Fallback enviado após falha no parágrafo');
            } catch (fallbackErr) {
              console.error('❌ Até o fallback falhou:', fallbackErr);
            }
            
            // Parar o loop - não enviar parágrafos fora de ordem
            break;
          }
          
          // Delay entre parágrafos (exceto o último)
          if (i < paragraphs.length - 1) {
            // ±1 segundo do valor configurado para parecer mais natural
            const delay = (baseDelay + (Math.random() * 2 - 1)) * 1000;
            console.log(`⏳ Aguardando ${(delay / 1000).toFixed(1)}s antes do próximo parágrafo...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
        
        if (!paragraphsFailed) {
          console.log('✅ Todos os parágrafos enviados com sucesso via Z-API');
        }
      } catch (sendErr) {
        console.error('❌ Erro inesperado no bloco de envio:', sendErr);
        
        await supabase.from('system_logs').insert({
          source: 'zapi-webhook',
          log_type: 'error',
          severity: 'error',
          company_id: companyId,
          message: 'Erro inesperado ao processar envio de parágrafos',
          metadata: { error: String(sendErr), conversationId }
        });
      }
    }

    console.log('🤖 ==================== AUTO-RESPOSTA DA IA FINALIZADA ====================');
  } catch (error) {
    console.error('❌ ERRO FATAL em processAIResponse:', {
      name: (error as Error)?.name,
      message: (error as Error)?.message,
      stack: (error as Error)?.stack,
      context: { conversationId, contactId, companyId }
    });
    
    // Tentar enviar fallback mesmo em erro fatal
    try {
      await sendFallbackMessage(supabase, {
        conversationId,
        whatsappConnectionId,
        phone,
        message: FALLBACK_MESSAGE,
        companyId,
        errorType: 'fatal_error'
      });
    } catch (fallbackErr) {
      console.error('❌ Falha total ao enviar fallback:', fallbackErr);
    }
    
    await supabase.from('system_logs').insert({
      source: 'zapi-webhook',
      log_type: 'error',
      severity: 'critical',
      company_id: companyId,
      message: 'Erro fatal ao processar resposta da IA',
      metadata: {
        error: {
          name: (error as Error)?.name,
          message: (error as Error)?.message,
          stack: (error as Error)?.stack
        },
        context: { conversationId, contactId, companyId }
      }
    });
  }
}

// Função auxiliar para enviar mensagem de fallback
async function sendFallbackMessage(supabase: any, params: {
  conversationId: string;
  whatsappConnectionId: string;
  phone: string;
  message: string;
  companyId: string;
  errorType: string;
}) {
  const { conversationId, whatsappConnectionId, phone, message, companyId, errorType } = params;
  
  try {
    await supabase.functions.invoke('zapi-send-message', {
      body: {
        conversationId,
        whatsappConnectionId,
        phone,
        message,
        mediaUrl: null
      }
    });
    console.log(`✅ Mensagem de fallback (${errorType}) enviada ao cliente`);
  } catch (sendErr) {
    console.error(`❌ Falha ao enviar mensagem de fallback (${errorType}):`, sendErr);
  }
  
  // Logar evento para monitoramento
  await supabase.from('system_logs').insert({
    source: 'zapi-webhook',
    log_type: 'warning',
    severity: 'warn',
    company_id: companyId,
    message: `Fallback enviado: ${errorType}`,
    metadata: { 
      conversationId, 
      errorType,
      fallbackMessage: message.substring(0, 100)
    }
  });
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check / warming
  if (req.url.includes('?warming=true')) {
    return new Response(JSON.stringify({ status: 'ok', warming: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const startTime = Date.now();

    // Validar método
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Invalid method' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405
      });
    }

    // Ler RAW BODY primeiro
    const rawBody = await req.text();
    console.log('📦 RAW BODY RECEIVED:', rawBody);

    // Parse JSON
    let body: any;
    try {
      body = JSON.parse(rawBody);
      console.log('📦 PARSED PAYLOAD:', JSON.stringify(body, null, 2));
    } catch (parseError) {
      console.error('❌ ERRO AO PARSEAR JSON:', parseError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid JSON',
        rawBody: rawBody.substring(0, 500)
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    // ==================== IDENTIFICAÇÃO DO TIPO DE EVENTO ====================
    const eventType = body.type || body.event || body.webhookType || 'unknown';
    console.log('🔔 EVENTO RECEBIDO:', {
      type: eventType,
      instanceId: body.instanceId,
      hasMessage: !!body.messageId,
      fromMe: body.fromMe,
      timestamp: new Date().toISOString()
    });

    // Se for evento de status/presença, apenas logar e retornar sucesso
    if (eventType === 'MessageStatusCallback' || eventType === 'PresenceChatCallback') {
      console.log(`📋 Evento ${eventType} recebido e ignorado (não requer processamento)`);
      return new Response(JSON.stringify({ success: true, eventType }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ==================== PROCESSAMENTO DE EVENTOS DE CONEXÃO ====================
    
    // Processa eventos de status de conexão (apenas se NÃO for uma mensagem)
    if ((body.event === 'connection.update' || body.connected !== undefined) && !body.messageId) {
      const instanceId = body.instanceId || body.instance;
      
      if (!instanceId) {
        console.log('⚠️ Status update sem instanceId, ignorando');
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Buscar conexão por instance_id
      const { data: connection } = await supabase
        .from('whatsapp_connections')
        .select('id, phone')
        .eq('z_api_instance_id', instanceId)
        .single();

      if (!connection) {
        console.log('⚠️ Conexão não encontrada para instanceId:', instanceId);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Extrair informações de status
      const isConnected = body.connected === true || body.state === 'open';
      const phoneNumber = body.phone || body.phoneNumber || connection.phone;

      console.log('📡 Atualizando status da conexão:', {
        connectionId: connection.id,
        isConnected,
        phoneNumber
      });

      // Atualizar conexão
      await supabase
        .from('whatsapp_connections')
        .update({
          is_connected: isConnected,
          phone: phoneNumber
        })
        .eq('id', connection.id);

      return new Response(JSON.stringify({ 
        success: true,
        connectionUpdated: true,
        isConnected
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ==================== PROCESSAMENTO DE MENSAGENS ====================

    // VALIDAÇÃO ESTRITA: Processar SOMENTE ReceivedCallback
    if (eventType !== 'ReceivedCallback') {
      console.log(`⏭️ Evento ${eventType} não é ReceivedCallback, ignorando processamento de mensagem`);
      return new Response(JSON.stringify({ 
        success: true, 
        ignored: true, 
        reason: 'not_received_callback',
        eventType 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Ignorar mensagens enviadas por nós mesmos
    if (body.fromMe === true) {
      console.log('⏭️ Ignorando mensagem enviada por nós (fromMe: true)');
      return new Response(JSON.stringify({ success: true, ignored: true, reason: 'fromMe' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Extrair dados da mensagem
    const messageId = body.messageId || body.id?.id;
    const instanceId = body.instanceId || body.instance;
    const phone = body.phone || body.chatId || body.from;
    const senderName = body.senderName || body.chatName || body.pushName;
    const pushName = body.pushName || body.notifyName;
    const senderPhoto = body.photo || body.senderPhoto || body.profilePicThumb;
    
    // Extrair conteúdo da mensagem
    let messageText = '';
    let mediaUrl = null;
    let messageType = 'text';

    if (body.text?.message) {
      messageText = body.text.message;
      messageType = 'text';
    } else if (body.image) {
      mediaUrl = body.image.imageUrl || body.image.downloadUrl;
      messageText = body.image.caption || '[Imagem]';
      messageType = 'image';
    } else if (body.audio) {
      mediaUrl = body.audio.audioUrl || body.audio.downloadUrl;
      messageText = '[Áudio]';
      messageType = 'audio';
    } else if (body.video) {
      mediaUrl = body.video.videoUrl || body.video.downloadUrl;
      messageText = body.video.caption || '[Vídeo]';
      messageType = 'video';
    } else if (body.document) {
      mediaUrl = body.document.documentUrl || body.document.downloadUrl;
      messageText = body.document.caption || body.document.fileName || '[Documento]';
      messageType = 'document';
    }

    const whatsappTimestamp = body.momment || Date.now();

    if (!phone) {
      console.log('⚠️ Webhook sem telefone, ignorando');
      return new Response(JSON.stringify({ success: true, ignored: true, reason: 'no_phone' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Normalizar telefone
    const normalizedPhone = normalizePhoneWithCountryCode(phone);
    console.log('📞 Telefone normalizado:', { original: phone, normalized: normalizedPhone });

    // ==================== BUSCAR OU CRIAR CONEXÃO ====================

    const { data: connection, error: connectionError } = await supabase
      .from('whatsapp_connections')
      .select('id, company_id')
      .eq('z_api_instance_id', instanceId)
      .single();

    if (connectionError || !connection) {
      console.error('❌ Conexão Z-API não encontrada para instanceId:', instanceId);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Connection not found',
        instanceId 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      });
    }

    // Buscar Client Token global de zapi_settings
    const { data: zapiSettings } = await supabase
      .from('zapi_settings')
      .select('client_token')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();
    
    const clientToken = zapiSettings?.client_token || null;

    console.log('✅ CHECKPOINT 1: Connection found', connection.id);

    const companyId = connection.company_id;

    // ==================== VERIFICAR SE IA ESTÁ HABILITADA PARA EMPRESA ====================
    const { data: aiSettings } = await supabase
      .from('company_ai_settings')
      .select('ai_enabled')
      .eq('company_id', companyId)
      .single();
    
    const companyAIEnabled = aiSettings?.ai_enabled ?? false;
    console.log('🤖 IA habilitada para empresa:', companyAIEnabled);

    // ==================== PROCESSAMENTO DE MÍDIA ====================
    
    let enrichedMessageText = messageText;

    // ===== PROCESSAMENTO DE ÁUDIO =====
    if (messageType === 'audio' && mediaUrl) {
      console.log('🎤 Detectado áudio, transcrevendo...');
      try {
        const { data: transcription, error: transcriptionError } = await supabase.functions.invoke('audio-transcription', {
          body: { 
            audioUrl: mediaUrl,
            companyId,
            contactId: null, // será preenchido após buscar contato
            conversationId: null
          }
        });
        
        if (!transcriptionError && transcription?.text) {
          enrichedMessageText = `[Áudio transcrito]: ${transcription.text}`;
          console.log('✅ Áudio transcrito:', enrichedMessageText.substring(0, 100));
        } else {
          console.error('⚠️ Falha na transcrição:', transcriptionError);
          enrichedMessageText = '[Áudio não transcrito]';
        }
      } catch (err) {
        console.error('⚠️ Erro ao transcrever áudio:', err);
        enrichedMessageText = '[Áudio não transcrito]';
      }
    }

    // ===== PROCESSAMENTO DE IMAGEM =====
    if (messageType === 'image' && mediaUrl) {
      console.log('🖼️ Detectada imagem, analisando...');
      try {
        const { data: imageAnalysis, error: imageError } = await supabase.functions.invoke('process-image', {
          body: { 
            imageUrl: mediaUrl,
            companyId
          }
        });
        
        if (!imageError && imageAnalysis?.description) {
          const caption = body.image?.caption || '';
          enrichedMessageText = `[Imagem: ${imageAnalysis.description}]${caption ? ` Legenda: ${caption}` : ''}`;
          console.log('✅ Imagem analisada:', enrichedMessageText.substring(0, 100));
        } else {
          console.error('⚠️ Falha na análise de imagem:', imageError);
          enrichedMessageText = '[Imagem não analisada]';
        }
      } catch (err) {
        console.error('⚠️ Erro ao analisar imagem:', err);
        enrichedMessageText = '[Imagem não analisada]';
      }
    }

    // ==================== BUSCAR OU CRIAR CONTATO ====================

    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .upsert({
        company_id: companyId,
        phone: normalizedPhone,
        name: senderName || normalizedPhone,
        whatsapp_push_name: pushName,
        profile_picture_url: senderPhoto,
        last_contact_date: new Date().toISOString()
      }, {
        onConflict: 'company_id,phone',
        ignoreDuplicates: false
      })
      .select('id, tags')
      .single();

    if (contactError || !contact) {
      console.error('❌ Erro ao criar/buscar contato:', contactError);
      return new Response(JSON.stringify({ success: false, error: 'Contact error' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }

    console.log('✅ CHECKPOINT 2: Contact upserted', contact.id);

    // Invocar fetch de foto de perfil em background (não-bloqueante)
    supabase.functions.invoke('zapi-fetch-profile-picture', {
      body: {
        contactId: contact.id,
        phone: normalizedPhone,
        instanceId,
        companyId
      }
    }).catch((err: any) => {
      console.error('⚠️ Erro ao invocar fetch de profile picture:', err);
    });

    // ==================== BUSCAR OU CRIAR CONVERSA ====================

    // Determinar status inicial da conversa
    const initialStatus = contact.tags?.includes("IA Desativada") ? 'human' : 'ai';

    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .upsert({
        company_id: companyId,
        contact_id: contact.id,
        whatsapp_connection_id: connection.id,
        status: initialStatus,
        last_message_at: new Date().toISOString()
      }, {
        onConflict: 'contact_id,whatsapp_connection_id',
        ignoreDuplicates: false
      })
      .select('id, status, ai_disabled_until')
      .single();

    if (conversationError || !conversation) {
      console.error('❌ Erro ao criar/buscar conversa:', conversationError);
      return new Response(JSON.stringify({ success: false, error: 'Conversation error' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }

    console.log('✅ CHECKPOINT 3: Conversation ready', conversation.id);

    // ==================== SALVAR MENSAGEM (COM PROTEÇÃO CONTRA DUPLICATAS) ====================

    // Usar UPSERT com ignoreDuplicates para prevenir mensagens duplicadas
    // Se message_id já existir para esta conexão, ignora silenciosamente
    const { data: savedMessage, error: messageError } = await supabase
      .from('whatsapp_messages')
      .upsert({
        company_id: companyId,
        contact_id: contact.id,
        conversation_id: conversation.id,
        whatsapp_connection_id: connection.id,
        direction: 'inbound',
        content: enrichedMessageText,
        message_id: messageId,
        message_type: messageType,
        media_url: mediaUrl,
        phone: normalizedPhone,
        whatsapp_timestamp: whatsappTimestamp,
      }, {
        onConflict: 'whatsapp_connection_id,message_id',
        ignoreDuplicates: true
      })
      .select('id')
      .maybeSingle();

    // Se savedMessage é null, significa que era duplicata e foi ignorada
    if (!savedMessage) {
      console.log('⏭️ Mensagem duplicada ignorada (message_id já existe):', messageId);
      return new Response(JSON.stringify({ 
        success: true, 
        ignored: true, 
        reason: 'duplicate_message',
        messageId 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (messageError) {
      console.error('❌ Erro ao salvar mensagem:', messageError);
      return new Response(JSON.stringify({ success: false, error: 'Message save error' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }

    console.log('✅ CHECKPOINT 4: Message saved', savedMessage.id);

    // Atualizar conversa como não lida
    await supabase
      .from('conversations')
      .update({ 
        is_unread: true,
        last_message_at: new Date().toISOString()
      })
      .eq('id', conversation.id);

    // ==================== VERIFICAR SE DEVE RESPONDER COM IA ====================

    const shouldRespond = companyAIEnabled && 
                          conversation.status === 'ai' && 
                          isAIActive(conversation.ai_disabled_until, contact.tags);

    console.log('✅ CHECKPOINT 5: AI check', {
      companyAIEnabled,
      conversationStatus: conversation.status,
      aiDisabledUntil: conversation.ai_disabled_until,
      contactTags: contact.tags,
      shouldRespond
    });

    // DEBOUNCE 10s: Agendar processamento em background
    // Se outra mensagem chegar antes, o novo timer "ganha" (o antigo verifica e desiste)
    if (shouldRespond) {
      const processAt = new Date(Date.now() + 10000).toISOString(); // 10 segundos no futuro
      
      await supabase
        .from('conversations')
        .update({ pending_ai_processing_at: processAt })
        .eq('id', conversation.id);
      
      console.log('⏱️ DEBOUNCE: Agendando IA para 10s depois:', processAt);
      
      // Usar EdgeRuntime.waitUntil para processar em background após 10s
      // @ts-ignore - EdgeRuntime é disponível no Deno runtime do Supabase
      EdgeRuntime.waitUntil((async () => {
        try {
          // Esperar 10 segundos
          await new Promise(resolve => setTimeout(resolve, 10000));
          
          // LOCK ATÔMICO: Tentar "capturar" o processamento limpando o timestamp
          // Só quem conseguir limpar o timestamp COM o valor esperado prossegue
          // Isso evita race conditions quando múltiplos webhooks chegam simultaneamente
          const { data: lockResult } = await supabase
            .from('conversations')
            .update({ pending_ai_processing_at: null })
            .eq('id', conversation.id)
            .eq('pending_ai_processing_at', processAt) // Só atualiza se timestamp ainda bater
            .select('id')
            .maybeSingle();
          
          // Se lockResult é null, significa que outro processo já limpou ou timestamp mudou
          if (!lockResult) {
            console.log('⏭️ DEBOUNCE: Lock não adquirido - outro processo ganhou ou timer foi resetado', {
              expectedTime: processAt
            });
            return;
          }
          
          console.log('🔒 DEBOUNCE: Lock adquirido, processando após 10s de espera...');
          
          // Buscar TODAS as mensagens dos últimos 15 segundos para concatenar
          const cutoffTime = new Date(Date.now() - 15000).toISOString();
          const { data: recentMessages } = await supabase
            .from('whatsapp_messages')
            .select('content, created_at')
            .eq('conversation_id', conversation.id)
            .eq('direction', 'inbound')
            .gte('created_at', cutoffTime)
            .order('created_at', { ascending: true });
          
          // Concatenar mensagens
          const concatenatedMessage = recentMessages && recentMessages.length > 0
            ? recentMessages.map(m => m.content).join('\n\n')
            : enrichedMessageText;
          
          console.log('📝 DEBOUNCE: Mensagens concatenadas:', {
            count: recentMessages?.length || 1,
            preview: concatenatedMessage.substring(0, 100)
          });
          
          // Chamar a IA com todas as mensagens concatenadas
          await processAIResponse({
            supabase,
            conversationId: conversation.id,
            contactId: contact.id,
            companyId,
            whatsappConnectionId: connection.id,
            inboundMessageText: concatenatedMessage,
            phone: normalizedPhone
          });
          
          console.log('✅ DEBOUNCE: Processamento concluído');
        } catch (err) {
          console.error('❌ DEBOUNCE: Erro no processamento:', err);
        }
      })());
    } else {
      console.log('⏭️ IA não responderá:', { companyAIEnabled, status: conversation.status });
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ Webhook processado em ${processingTime}ms`);

    return new Response(JSON.stringify({
      success: true,
      messageId: savedMessage.id,
      conversationId: conversation.id,
      contactId: contact.id,
      aiTriggered: shouldRespond,
      processingTime
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ ERRO FATAL no webhook:', {
      name: (error as Error)?.name,
      message: (error as Error)?.message,
      stack: (error as Error)?.stack
    });

    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
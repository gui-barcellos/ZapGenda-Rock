import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função auxiliar para logar no sistema (apenas superuser verá)
async function logToSystem(
  supabaseAdmin: any,
  message: string,
  severity: 'debug' | 'info' | 'warn' | 'error' | 'critical',
  metadata?: Record<string, any>
) {
  try {
    await supabaseAdmin.from("system_logs").insert({
      log_type: "edge_function",
      severity,
      source: "zapi-send-message",
      message,
      metadata,
      company_id: metadata?.company_id,
      user_id: metadata?.user_id,
    });
  } catch (err) {
    console.error("Log to system_logs failed:", err);
  }
}

// Função auxiliar para normalizar telefones para formato com DDI brasileiro (55XXXXXXXXXXX)
function normalizePhoneWithCountryCode(phone: string): string {
  // Remove tudo exceto números
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Se já começa com 55 e tem 12-13 dígitos, retorna como está
  if (cleanPhone.startsWith('55') && (cleanPhone.length === 12 || cleanPhone.length === 13)) {
    return cleanPhone;
  }
  
  // Se tem 10-11 dígitos sem 55, adiciona 55 no início
  if (cleanPhone.length === 10 || cleanPhone.length === 11) {
    return '55' + cleanPhone;
  }
  
  // Retorna limpo (caso não se encaixe nos padrões)
  return cleanPhone;
}

// Função para enviar mensagem com retry e backoff exponencial
async function sendWithRetry(
  url: string,
  headers: Record<string, string>,
  body: string,
  maxRetries: number = 3
): Promise<{ ok: boolean; status: number; data?: any; error?: string }> {
  const delays = [0, 1000, 3000]; // 0s, 1s, 3s de delay
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) {
      console.log(`🔄 Retry ${attempt}/${maxRetries - 1} após ${delays[attempt]}ms...`);
      await new Promise(resolve => setTimeout(resolve, delays[attempt]));
    }
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
      });

      if (response.ok) {
        const data = await response.json();
        return { ok: true, status: response.status, data };
      }

      // Erros que não devem ter retry (autenticação, etc)
      if (response.status === 401 || response.status === 403 || response.status === 404) {
        const errorText = await response.text();
        return { ok: false, status: response.status, error: errorText };
      }

      // Para outros erros (5xx, 429), tentar novamente
      if (attempt === maxRetries - 1) {
        const errorText = await response.text();
        return { ok: false, status: response.status, error: errorText };
      }
      
      console.warn(`⚠️ Tentativa ${attempt + 1} falhou com status ${response.status}, tentando novamente...`);
    } catch (err) {
      console.error(`❌ Erro na tentativa ${attempt + 1}:`, err);
      if (attempt === maxRetries - 1) {
        return { ok: false, status: 0, error: err instanceof Error ? err.message : 'Network error' };
      }
    }
  }
  
  return { ok: false, status: 0, error: 'Max retries exceeded' };
}

/**
 * zapi-send-message - Dual Authentication Mode with Retry
 * 
 * Suporta dois modos de autenticação:
 * 
 * 1. Frontend Mode (JWT):
 *    - Chamado pelo chat do painel com JWT de usuário
 *    - Busca company_id pelo userId do token
 *    - Valida permissões do usuário
 * 
 * 2. Server-to-Server Mode (Service Role):
 *    - Chamado por zapi-webhook-receiver para auto-resposta da IA
 *    - Usa SUPABASE_SERVICE_ROLE_KEY
 *    - Busca company_id pela conversationId
 *    - Valida que conversation pertence à conexão WhatsApp
 * 
 * Ambos os modos:
 * - Validam que company_id corresponde à conexão WhatsApp
 * - Aplicam rate limiting por empresa (60 msgs/min)
 * - Implementam retry com backoff exponencial (3 tentativas)
 * - Registram logs em system_logs
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ==================== DETECÇÃO DE MODO ====================
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    let isServerToServer = false;
    let companyId: string;

    if (authHeader) {
      // PRIORIDADE 1: Verificar se é SERVICE_ROLE_KEY (chamada server-to-server)
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
      if (authHeader.includes(serviceRoleKey)) {
        isServerToServer = true;
        console.log('✅ Server-to-server call detected (service role)');
      } else {
        // PRIORIDADE 2: Tentar decodificar JWT (chamada frontend)
        try {
          const token = authHeader.replace('Bearer ', '');
          const payload = JSON.parse(atob(token.split('.')[1]));
          userId = payload.sub || null;
          
          if (!userId) {
            throw new Error('Invalid token: missing user ID');
          }
          
          console.log('✅ Frontend call detected (JWT with userId)');
        } catch (err) {
          throw new Error('Invalid authorization header');
        }
      }
    } else {
      throw new Error('Missing authorization header');
    }

    // Criar cliente Supabase com service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { whatsappConnectionId, phone: rawPhone, message, conversationId, contactId } = await req.json();
    const phone = normalizePhoneWithCountryCode(rawPhone);

    console.log('📊 zapi-send-message execution:', {
      mode: isServerToServer ? 'server-to-server' : 'frontend',
      conversationId,
      whatsappConnectionId,
      phone
    });

    // Buscar conexão WhatsApp
    const { data: connection, error: connectionError } = await supabase
      .from('whatsapp_connections')
      .select('*')
      .eq('id', whatsappConnectionId)
      .single();

    if (connectionError || !connection) {
      throw new Error('WhatsApp connection not found');
    }

    // Buscar Client Token global da tabela zapi_settings
    const { data: zapiSettings } = await supabase
      .from('zapi_settings')
      .select('client_token')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();
    
    const clientToken = zapiSettings?.client_token || null;

    // ==================== VALIDAÇÃO DE COMPANY_ID ====================
    if (isServerToServer) {
      // Modo server-to-server: buscar company_id pela conversa
      console.log('🔍 Server-to-server: fetching company_id from conversation...');
      
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('company_id')
        .eq('id', conversationId)
        .single();
      
      if (convError || !conversation) {
        await logToSystem(supabase, 'Conversation not found for server-to-server call', 'error', {
          conversationId,
          error: convError?.message
        });
        throw new Error('Conversation not found');
      }
      
      companyId = conversation.company_id;
      console.log('✅ Company ID from conversation:', companyId);
      
    } else {
      // Modo frontend: buscar company_id pelo userId
      console.log('🔍 Frontend: fetching company_id from user profile...');
      
      if (!userId) {
        throw new Error('Invalid token: missing user ID');
      }
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', userId)
        .single();
      
      if (profileError || !profile) {
        await logToSystem(supabase, 'User profile not found', 'error', {
          userId,
          error: profileError?.message
        });
        throw new Error('User profile not found');
      }
      
      companyId = profile.company_id;
      console.log('✅ Company ID from profile:', companyId);
    }

    // Validar permissão: company_id deve coincidir com a conexão
    if (companyId !== connection.company_id) {
      await logToSystem(supabase, 'Unauthorized access attempt', 'warn', {
        requestCompanyId: companyId,
        connectionCompanyId: connection.company_id,
        mode: isServerToServer ? 'server-to-server' : 'frontend'
      });
      throw new Error('Unauthorized access to connection');
    }

    console.log('✅ Permission validated: company_id matches connection');
    // ==================== FIM VALIDAÇÃO ====================

    // ========== RATE LIMITING ==========
    const rateLimitKey = `rate_limit:${companyId}`;
    const now = new Date();
    const resetWindow = 60000; // 60 segundos
    const maxRequests = 60; // 60 mensagens por minuto

    // Buscar contador atual
    const { data: limit } = await supabase
      .from('rate_limits')
      .select('count, reset_at')
      .eq('key', rateLimitKey)
      .single();

    if (limit) {
      const resetAt = new Date(limit.reset_at);
      
      if (resetAt > now) {
        // Dentro da janela atual
        if (limit.count >= maxRequests) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Rate limit exceeded. Try again in a moment.',
              resetAt: limit.reset_at
            }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Incrementar contador
        await supabase
          .from('rate_limits')
          .update({ count: limit.count + 1 })
          .eq('key', rateLimitKey);
      } else {
        // Resetar contador (janela expirada)
        await supabase
          .from('rate_limits')
          .update({ 
            count: 1, 
            reset_at: new Date(now.getTime() + resetWindow).toISOString() 
          })
          .eq('key', rateLimitKey);
      }
    } else {
      // Criar novo registro
      await supabase
        .from('rate_limits')
        .insert({
          key: rateLimitKey,
          count: 1,
          reset_at: new Date(now.getTime() + resetWindow).toISOString(),
        });
    }
    // ========== FIM RATE LIMITING ==========

    await logToSystem(supabase, "Iniciando envio de mensagem via Z-API", "info", {
      company_id: companyId,
      user_id: userId,
      phone,
      conversationId,
      message_length: message.length,
    });

    // Preparar headers (Client Token é opcional)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (clientToken) {
      headers['Client-Token'] = clientToken;
    }

    // Enviar mensagem via Z-API COM RETRY
    const zapiResult = await sendWithRetry(
      `https://api.z-api.io/instances/${connection.z_api_instance_id}/token/${connection.z_api_token}/send-text`,
      headers,
      JSON.stringify({
        phone, // já normalizado
        message,
      }),
      3 // maxRetries
    );

    if (!zapiResult.ok) {
      console.error('Z-API send failed after retries:', zapiResult.error);
      
      await logToSystem(supabase, `Erro ao enviar mensagem via Z-API após ${3} tentativas: ${zapiResult.status}`, "error", {
        company_id: companyId,
        user_id: userId,
        phone,
        status: zapiResult.status,
        errorData: zapiResult.error,
      });
      
      // Se erro de autenticação, marcar conexão como desconectada
      if (zapiResult.status === 401 || zapiResult.status === 403) {
        await supabase
          .from('whatsapp_connections')
          .update({ is_connected: false })
          .eq('id', whatsappConnectionId);
      }

      throw new Error(`Z-API error: ${zapiResult.error}`);
    }

    const zapiData = zapiResult.data;
    console.log('Z-API response:', zapiData);

    // Log detalhado de sucesso
    await logToSystem(
      supabase,
      `Mensagem enviada com sucesso via Z-API`,
      'info',
      {
        company_id: companyId,
        user_id: userId,
        phone,
        messageId: zapiData.messageId,
        conversationId,
      }
    );

    // Inserir mensagem no banco
    const { data: messageData, error: messageError } = await supabase
      .from('whatsapp_messages')
      .insert({
        company_id: connection.company_id,
        contact_id: contactId,
        conversation_id: conversationId,
        whatsapp_connection_id: whatsappConnectionId,
        direction: 'outbound',
        content: message,
        message_id: zapiData.messageId,
        message_type: 'text',
        phone,
        sent_by_user_id: userId,
        whatsapp_timestamp: Date.now(),
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error inserting message:', messageError);
      throw messageError;
    }

    // Atualizar last_message_at da conversa
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    await logToSystem(supabase, "Mensagem enviada com sucesso", "info", {
      company_id: companyId,
      user_id: userId,
      phone,
      messageId: zapiData.messageId,
      conversationId,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: messageData,
        zapiMessageId: zapiData.messageId 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error sending message:', error);
    
    // Logar erro crítico
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      await logToSystem(supabase, `Erro crítico: ${error instanceof Error ? error.message : 'Unknown error'}`, "critical", {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
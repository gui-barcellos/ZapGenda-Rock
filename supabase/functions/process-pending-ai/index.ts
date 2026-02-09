import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Process Pending AI - Cron job que processa mensagens pendentes com debounce de 10 segundos
 * 
 * Fluxo:
 * 1. Busca conversas onde pending_ai_processing_at <= now() (timer expirou)
 * 2. Para cada conversa, busca TODAS as mensagens inbound desde a última resposta da IA
 * 3. Concatena as mensagens e chama chat-ai-responses uma única vez
 * 4. Limpa pending_ai_processing_at
 */

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const startTime = Date.now();
    const now = new Date().toISOString();
    
    console.log('🔄 Process Pending AI - Iniciando...', { now });

    // 1. Buscar conversas com processamento pendente que já passou do tempo
    const { data: pendingConversations, error: fetchError } = await supabase
      .from('conversations')
      .select(`
        id,
        company_id,
        contact_id,
        whatsapp_connection_id,
        pending_ai_processing_at,
        contacts!inner(id, phone, tags)
      `)
      .not('pending_ai_processing_at', 'is', null)
      .lte('pending_ai_processing_at', now);

    if (fetchError) {
      console.error('❌ Erro ao buscar conversas pendentes:', fetchError);
      throw fetchError;
    }

    if (!pendingConversations || pendingConversations.length === 0) {
      console.log('✅ Nenhuma conversa pendente para processar');
      return new Response(JSON.stringify({ 
        success: true, 
        processed: 0,
        processingTime: Date.now() - startTime
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📋 Encontradas ${pendingConversations.length} conversas pendentes`);

    let processedCount = 0;
    let errorCount = 0;

    // 2. Processar cada conversa
    for (const conv of pendingConversations) {
      try {
        console.log(`\n🔍 Processando conversa ${conv.id}...`);

        // Buscar última resposta da IA (mensagem outbound mais recente)
        const { data: lastAIResponse } = await supabase
          .from('whatsapp_messages')
          .select('created_at')
          .eq('conversation_id', conv.id)
          .eq('direction', 'outbound')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const lastResponseTime = lastAIResponse?.created_at || '1970-01-01T00:00:00Z';
        console.log(`📅 Última resposta da IA: ${lastResponseTime}`);

        // Buscar TODAS as mensagens inbound desde a última resposta
        const { data: pendingMessages, error: messagesError } = await supabase
          .from('whatsapp_messages')
          .select('content, created_at')
          .eq('conversation_id', conv.id)
          .eq('direction', 'inbound')
          .gt('created_at', lastResponseTime)
          .order('created_at', { ascending: true });

        if (messagesError) {
          console.error(`❌ Erro ao buscar mensagens da conversa ${conv.id}:`, messagesError);
          errorCount++;
          continue;
        }

        if (!pendingMessages || pendingMessages.length === 0) {
          console.log(`⏭️ Nenhuma mensagem pendente na conversa ${conv.id}`);
          // Limpar flag mesmo assim
          await supabase
            .from('conversations')
            .update({ pending_ai_processing_at: null })
            .eq('id', conv.id);
          continue;
        }

        // Concatenar todas as mensagens
        const concatenatedMessage = pendingMessages
          .map(m => m.content)
          .filter(Boolean)
          .join(' ');

        console.log(`📝 ${pendingMessages.length} mensagens concatenadas:`, 
          concatenatedMessage.substring(0, 100) + (concatenatedMessage.length > 100 ? '...' : ''));

        // Buscar telefone do contato
        const contactPhone = (conv.contacts as any)?.phone;
        
        if (!contactPhone) {
          console.error(`❌ Telefone não encontrado para conversa ${conv.id}`);
          errorCount++;
          continue;
        }

        // 3. Chamar chat-ai-responses
        console.log('🤖 Chamando chat-ai-responses...');
        
        const { error: aiError } = await supabase.functions.invoke('chat-ai-responses', {
          body: {
            conversationId: conv.id,
            contactId: conv.contact_id,
            companyId: conv.company_id,
            whatsappConnectionId: conv.whatsapp_connection_id,
            inboundMessageText: concatenatedMessage,
            phone: contactPhone
          }
        });

        if (aiError) {
          console.error(`❌ Erro ao chamar chat-ai-responses para conversa ${conv.id}:`, aiError);
          errorCount++;
          // Não limpar flag para tentar novamente
          continue;
        }

        // 4. Limpar flag de processamento pendente
        await supabase
          .from('conversations')
          .update({ pending_ai_processing_at: null })
          .eq('id', conv.id);

        console.log(`✅ Conversa ${conv.id} processada com sucesso`);
        processedCount++;

      } catch (convError) {
        console.error(`❌ Erro ao processar conversa ${conv.id}:`, convError);
        errorCount++;
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`\n✅ Process Pending AI concluído em ${processingTime}ms`, {
      total: pendingConversations.length,
      processed: processedCount,
      errors: errorCount
    });

    return new Response(JSON.stringify({
      success: true,
      total: pendingConversations.length,
      processed: processedCount,
      errors: errorCount,
      processingTime
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ ERRO FATAL no process-pending-ai:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

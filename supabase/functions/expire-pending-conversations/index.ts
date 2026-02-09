import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExpiredConversation {
  conversation_id: string;
  stage: string;
  company_id: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('[expire-pending-conversations] Starting cron job execution...');

  try {
    // 1. Fetch all expired conversation states (stage != 'idle' AND expires_at < now())
    const { data: expiredStates, error: fetchError } = await supabase
      .from('conversation_state')
      .select(`
        conversation_id,
        stage,
        company_id
      `)
      .neq('stage', 'idle')
      .lt('expires_at', new Date().toISOString());

    if (fetchError) {
      console.error('[expire-pending-conversations] Error fetching expired states:', fetchError);
      throw fetchError;
    }

    if (!expiredStates || expiredStates.length === 0) {
      console.log('[expire-pending-conversations] No expired conversations found');
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'No expired conversations' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[expire-pending-conversations] Found ${expiredStates.length} expired conversations`);

    let processedCount = 0;
    let errorCount = 0;

    for (const state of expiredStates as ExpiredConversation[]) {
      try {
        console.log(`[expire-pending-conversations] Processing conversation ${state.conversation_id}, stage: ${state.stage}`);

        // 2. Get conversation details with contact and whatsapp connection
        const { data: conversation, error: convError } = await supabase
          .from('conversations')
          .select(`
            id,
            whatsapp_connection_id,
            contact_id,
            contacts!inner(phone, name)
          `)
          .eq('id', state.conversation_id)
          .single();

        if (convError || !conversation) {
          console.error(`[expire-pending-conversations] Error fetching conversation ${state.conversation_id}:`, convError);
          errorCount++;
          continue;
        }

        // 3. Get company's expiration message
        const { data: aiConfig } = await supabase
          .from('company_ai_settings')
          .select('process_expired_message')
          .eq('company_id', state.company_id)
          .single();

        const expirationMessage = aiConfig?.process_expired_message || 
          '⏰ O tempo limite para confirmar seu agendamento foi excedido. Para agendar um novo horário, por favor inicie o processo novamente.';

        // 4. Send expiration message via zapi-send-message
        const contactData = conversation.contacts as unknown as { phone: string; name: string };
        const contact = { phone: contactData.phone, name: contactData.name };
        
        console.log(`[expire-pending-conversations] Sending expiration message to ${contact.phone}`);

        const { error: sendError } = await supabase.functions.invoke('zapi-send-message', {
          body: {
            whatsappConnectionId: conversation.whatsapp_connection_id,
            rawPhone: contact.phone,
            message: expirationMessage,
            conversationId: conversation.id,
            contactId: conversation.contact_id
          }
        });

        if (sendError) {
          console.error(`[expire-pending-conversations] Error sending message for conversation ${state.conversation_id}:`, sendError);
          errorCount++;
          // Continue to reset state even if message fails
        }

        // 5. Reset conversation state but KEEP last_response_id (memory preserved)
        const { error: resetError } = await supabase
          .from('conversation_state')
          .update({
            stage: 'idle',
            collected_data: {},
            confirmed_facts: [],
            pending_action: null,
            expires_at: null,
            updated_at: new Date().toISOString()
            // NOT resetting last_response_id - memory preserved!
          })
          .eq('conversation_id', state.conversation_id);

        if (resetError) {
          console.error(`[expire-pending-conversations] Error resetting state for conversation ${state.conversation_id}:`, resetError);
          errorCount++;
          continue;
        }

        // 6. Log the action
        await supabase.from('system_logs').insert({
          event_type: 'process_expired',
          company_id: state.company_id,
          severity: 'info',
          message: `Conversation expired and reset. Previous stage: ${state.stage}`,
          metadata: {
            conversation_id: state.conversation_id,
            previous_stage: state.stage,
            contact_phone: contact.phone,
            contact_name: contact.name
          }
        });

        processedCount++;
        console.log(`[expire-pending-conversations] Successfully processed conversation ${state.conversation_id}`);

      } catch (innerError) {
        console.error(`[expire-pending-conversations] Error processing conversation ${state.conversation_id}:`, innerError);
        errorCount++;
      }
    }

    const result = {
      success: true,
      processed: processedCount,
      errors: errorCount,
      total: expiredStates.length,
      timestamp: new Date().toISOString()
    };

    console.log('[expire-pending-conversations] Cron job completed:', result);

    // Log summary
    await supabase.from('system_logs').insert({
      event_type: 'cron_expire_conversations',
      severity: 'info',
      message: `Processed ${processedCount} expired conversations, ${errorCount} errors`,
      metadata: result
    });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[expire-pending-conversations] Critical error:', errorMessage);
    
    // Log critical error
    await supabase.from('system_logs').insert({
      event_type: 'cron_expire_conversations_error',
      severity: 'error',
      message: `Critical error in expire-pending-conversations: ${errorMessage}`,
      metadata: { error: errorMessage }
    });

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

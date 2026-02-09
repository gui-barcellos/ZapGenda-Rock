import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 [CRON] Iniciando verificação de conexões WhatsApp...');
    const startTime = Date.now();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Buscar Client Token global
    const { data: zapiSettings, error: zapiError } = await supabaseClient
      .from('zapi_settings')
      .select('client_token')
      .single();

    if (zapiError || !zapiSettings?.client_token) {
      console.error('❌ Client Token não configurado');
      return new Response(
        JSON.stringify({ error: 'Client Token não configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clientToken = zapiSettings.client_token;

    // 2. Buscar todas as conexões ativas
    const { data: connections, error: connectionsError } = await supabaseClient
      .from('whatsapp_connections')
      .select('id, company_id, z_api_instance_id, z_api_token, is_connected, phone, name')
      .eq('is_primary', true);

    if (connectionsError) {
      console.error('❌ Erro ao buscar conexões:', connectionsError);
      throw connectionsError;
    }

    if (!connections || connections.length === 0) {
      console.log('ℹ️ Nenhuma conexão encontrada para verificar');
      return new Response(
        JSON.stringify({ success: true, verified: 0, changed: 0, failed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Verificando ${connections.length} conexões...`);

    let verified = 0;
    let changed = 0;
    let failed = 0;
    const changes: any[] = [];

    // 3. Verificar cada conexão (com rate limiting)
    for (const connection of connections) {
      try {
        // Rate limiting: 2 requests/segundo
        if (verified > 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        const statusUrl = `https://api.z-api.io/instances/${connection.z_api_instance_id}/token/${connection.z_api_token}/status`;
        
        const statusResponse = await fetch(statusUrl, {
          method: 'GET',
          headers: {
            'Client-Token': clientToken,
            'Content-Type': 'application/json',
          },
        });

        if (!statusResponse.ok) {
          console.error(`❌ Erro ao verificar ${connection.name}: ${statusResponse.status}`);
          failed++;
          continue;
        }

        const statusData = await statusResponse.json();
        const isConnected = statusData.connected === true;
        const phone = statusData.phone || null;

        verified++;

        // Verificar se houve mudança
        if (connection.is_connected !== isConnected || connection.phone !== phone) {
          // Atualizar no banco
          const { error: updateError } = await supabaseClient
            .from('whatsapp_connections')
            .update({ 
              is_connected: isConnected,
              phone: phone,
            })
            .eq('id', connection.id);

          if (updateError) {
            console.error(`❌ Erro ao atualizar conexão ${connection.name}:`, updateError);
            failed++;
            continue;
          }

          changed++;
          const change = {
            company_id: connection.company_id,
            connection_name: connection.name,
            old_status: connection.is_connected ? 'Online' : 'Offline',
            new_status: isConnected ? 'Online' : 'Offline',
            old_phone: connection.phone,
            new_phone: phone,
          };
          changes.push(change);

          console.log(`🔄 ${connection.name}: ${change.old_status} → ${change.new_status}`);
        }
      } catch (error) {
        console.error(`❌ Erro ao processar ${connection.name}:`, error);
        failed++;
      }
    }

    const duration = Date.now() - startTime;

    // 4. Logar resultado em system_logs
    await supabaseClient
      .from('system_logs')
      .insert({
        source: 'verify-whatsapp-connections',
        log_type: 'cron_execution',
        severity: 'info',
        message: `Verificação WhatsApp concluída: ${verified} verificadas, ${changed} mudanças, ${failed} falhas`,
        metadata: {
          verified,
          changed,
          failed,
          duration_ms: duration,
          changes,
        },
      });

    console.log(`✅ [CRON] Verificação concluída: ${verified} verificadas, ${changed} mudanças, ${failed} falhas (${duration}ms)`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        verified, 
        changed, 
        failed, 
        changes,
        duration_ms: duration 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('❌ Erro no cron de verificação WhatsApp:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

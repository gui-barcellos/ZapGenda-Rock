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
    console.log('🔄 Iniciando reset mensal de tokens...');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Buscar total de tokens antes do reset
    const { data: companies, error: fetchError } = await supabaseClient
      .from('company_subscriptions')
      .select('current_ai_tokens');

    if (fetchError) {
      console.error('❌ Erro ao buscar empresas:', fetchError);
      throw fetchError;
    }

    const totalTokensReset = companies.reduce((sum, c) => sum + (c.current_ai_tokens || 0), 0);
    const companiesAffected = companies.length;

    console.log(`📊 Empresas encontradas: ${companiesAffected}`);
    console.log(`🔢 Total de tokens a resetar: ${totalTokensReset}`);

    // 2. Resetar tokens de todas as empresas
    const { error: resetError } = await supabaseClient
      .from('company_subscriptions')
      .update({ current_ai_tokens: 0 })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // atualizar todas

    if (resetError) {
      console.error('❌ Erro ao resetar tokens:', resetError);
      throw resetError;
    }

    console.log('✅ Tokens resetados com sucesso');

    // 3. Registrar no histórico
    const { error: historyError } = await supabaseClient
      .from('token_reset_history')
      .insert({
        companies_affected: companiesAffected,
        total_tokens_reset: totalTokensReset,
      });

    if (historyError) {
      console.error('❌ Erro ao registrar histórico:', historyError);
      throw historyError;
    }

    console.log('✅ Histórico registrado com sucesso');

    const result = {
      success: true,
      companiesAffected,
      totalTokensReset,
      resetDate: new Date().toISOString(),
    };

    console.log('🎉 Reset mensal concluído:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('❌ Erro no reset mensal:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

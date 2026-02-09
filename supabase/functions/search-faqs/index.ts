import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";
import { normalizeEmbedding } from '../_shared/personality-prompt.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, company_id } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Tentar busca semântica primeiro
    try {
      // Buscar API key OpenAI
      const { data: keyData } = await supabaseClient
        .from('openai_settings')
        .select('api_key')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (keyData?.api_key) {
        // Gerar embedding da pergunta
        const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${keyData.api_key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: message,
            model: 'text-embedding-3-small',
          }),
        });

        if (embeddingResponse.ok) {
          const embeddingData = await embeddingResponse.json();
          const embedding = embeddingData.data?.[0]?.embedding;

          if (embedding) {
            // Normalizar embedding antes de buscar
            const normalizedEmbedding = normalizeEmbedding(embedding);
            
            // Buscar FAQs similares via RPC
            const { data: semanticFaqs, error: rpcError } = await supabaseClient
              .rpc('search_similar_faqs', {
                query_embedding: normalizedEmbedding,
                match_threshold: 0.70,
                match_count: 3,
                p_company_id: company_id
              });

            if (!rpcError && semanticFaqs && semanticFaqs.length > 0) {
              console.log(`✅ Busca semântica FAQ: ${semanticFaqs.length} resultados`);
              return new Response(JSON.stringify({ 
                faqs: semanticFaqs,
                search_type: 'semantic'
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
            
            // Se RPC falhou ou não encontrou, log e usa fallback
            if (rpcError) {
              console.warn('⚠️ RPC search_similar_faqs falhou:', rpcError.message);
            }
          }
        }
      }
    } catch (semanticError) {
      console.warn('⚠️ Busca semântica falhou, usando fallback:', semanticError);
    }

    // Fallback: busca simples por texto
    const { data: faqs } = await supabaseClient
      .from('company_faqs')
      .select('question, answer, summary')
      .eq('company_id', company_id)
      .eq('is_active', true)
      .limit(3);

    console.log(`📋 Busca fallback FAQ: ${faqs?.length || 0} resultados`);

    return new Response(JSON.stringify({ 
      faqs: faqs || [],
      search_type: 'fallback'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in search-faqs:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { imageUrl, companyId } = await req.json();
    
    if (!imageUrl || !companyId) {
      throw new Error('Image URL and company ID are required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar OpenAI API key do banco
    const { data: keyData, error: keyError } = await supabaseClient
      .from('openai_settings')
      .select('api_key')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (keyError || !keyData?.api_key) {
      console.error('OpenAI API key not configured:', keyError);
      return new Response(JSON.stringify({ 
        error: 'OpenAI API key not configured' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const OPENAI_API_KEY = keyData.api_key;

    console.log('🖼️ Analisando imagem com GPT-5-mini...');

    // Chamar GPT-5-mini com visão
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [{
          role: 'user',
          content: [
            { 
              type: 'text', 
              text: 'Descreva esta imagem de forma objetiva em no máximo 2 frases para contextualizar um atendimento:' 
            },
            { 
              type: 'image_url', 
              image_url: { url: imageUrl } 
            }
          ]
        }],
        max_completion_tokens: 200
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI Vision error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const result = await response.json();
    const description = result.choices[0].message.content;

    console.log('✅ Imagem analisada:', description);

    return new Response(
      JSON.stringify({ description }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-image function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

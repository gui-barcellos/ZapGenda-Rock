import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    console.log('Starting Stripe products sync');

    // Get Stripe API key
    const { data: stripeSettings } = await supabaseAdmin
      .from('stripe_settings')
      .select('api_key')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (!stripeSettings?.api_key) {
      throw new Error('Chave Stripe não configurada');
    }

    // Get all resource prices
    const { data: resourcePrices, error } = await supabaseAdmin
      .from('resource_prices')
      .select('*');

    if (error) throw error;

    const results = [];

    for (const resource of resourcePrices || []) {
      console.log(`Processing resource: ${resource.resource_type}`);

      let productId = resource.stripe_product_id;
      let priceId = resource.stripe_price_id;

      // Create or update product if needed
      if (!productId) {
        const productResponse = await fetch('https://api.stripe.com/v1/products', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${stripeSettings.api_key}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            name: getProductName(resource.resource_type),
            description: getProductDescription(resource.resource_type),
            'metadata[resource_type]': resource.resource_type,
          }),
        });

        const product = await productResponse.json();
        if (!productResponse.ok) {
          console.error('Product creation error:', product);
          throw new Error(product.error?.message || 'Erro ao criar produto');
        }

        productId = product.id;
        console.log('Created product:', productId);
      }

      // Create or update price
      if (!priceId || true) { // Always create new price if amount changed
        const priceResponse = await fetch('https://api.stripe.com/v1/prices', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${stripeSettings.api_key}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            product: productId,
            unit_amount: Math.round(parseFloat(resource.monthly_price) * 100).toString(),
            currency: 'brl',
            'recurring[interval]': 'month',
            'metadata[resource_type]': resource.resource_type,
          }),
        });

        const price = await priceResponse.json();
        if (!priceResponse.ok) {
          console.error('Price creation error:', price);
          throw new Error(price.error?.message || 'Erro ao criar preço');
        }

        priceId = price.id;
        console.log('Created price:', priceId);
      }

      // Update database
      await supabaseAdmin
        .from('resource_prices')
        .update({
          stripe_product_id: productId,
          stripe_price_id: priceId,
        })
        .eq('id', resource.id);

      results.push({
        resource_type: resource.resource_type,
        product_id: productId,
        price_id: priceId,
      });
    }

    console.log('Stripe products sync completed');

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced: results.length,
        results 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in sync-stripe-products:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

function getProductName(resourceType: string): string {
  const names: Record<string, string> = {
    'user': 'Usuário Adicional',
    'professional': 'Profissional Adicional',
    'contact': '1000 Contatos',
    'whatsapp_number': 'Número WhatsApp Adicional',
    'ai_tokens': '1M Tokens AI',
  };
  return names[resourceType] || resourceType;
}

function getProductDescription(resourceType: string): string {
  const descriptions: Record<string, string> = {
    'user': 'Adicione mais usuários à sua conta',
    'professional': 'Adicione mais profissionais à sua agenda',
    'contact': 'Capacidade adicional de 1000 contatos',
    'whatsapp_number': 'Conecte números adicionais do WhatsApp',
    'ai_tokens': 'Pacote adicional de 1 milhão de tokens para IA',
  };
  return descriptions[resourceType] || `Recurso adicional: ${resourceType}`;
}
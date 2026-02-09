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

    const { company_id } = await req.json();
    console.log('Creating subscription for company:', company_id);

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

    // Get payment method
    const { data: paymentMethod } = await supabaseAdmin
      .from('payment_methods')
      .select('*')
      .eq('company_id', company_id)
      .single();

    if (!paymentMethod) {
      throw new Error('Método de pagamento não encontrado');
    }

    // Get subscription data
    const { data: subscription } = await supabaseAdmin
      .from('company_subscriptions')
      .select('*')
      .eq('company_id', company_id)
      .single();

    if (!subscription) {
      throw new Error('Dados de assinatura não encontrados');
    }

    // Get resource prices
    const { data: prices } = await supabaseAdmin
      .from('resource_prices')
      .select('*');

    if (!prices) {
      throw new Error('Preços não configurados');
    }

    // Calculate line items based on usage
    const lineItems = [];

    const priceMap: Record<string, any> = {};
    prices.forEach(p => {
      priceMap[p.resource_type] = p;
    });

    // Users
    if (subscription.max_users > 0) {
      const price = priceMap['user'];
      if (price?.stripe_price_id) {
        lineItems.push({
          price: price.stripe_price_id,
          quantity: subscription.max_users,
        });
      }
    }

    // Professionals
    if (subscription.max_professionals > 0) {
      const price = priceMap['professional'];
      if (price?.stripe_price_id) {
        lineItems.push({
          price: price.stripe_price_id,
          quantity: subscription.max_professionals,
        });
      }
    }

    // Contacts (in blocks of 1000)
    if (subscription.max_contacts > 0) {
      const blocks = Math.ceil(subscription.max_contacts / 1000);
      const price = priceMap['contact'];
      if (price?.stripe_price_id) {
        lineItems.push({
          price: price.stripe_price_id,
          quantity: blocks,
        });
      }
    }

    // WhatsApp numbers
    if (subscription.max_whatsapp_numbers > 0) {
      const price = priceMap['whatsapp_number'];
      if (price?.stripe_price_id) {
        lineItems.push({
          price: price.stripe_price_id,
          quantity: subscription.max_whatsapp_numbers,
        });
      }
    }

    // AI Tokens (in blocks of 1M)
    if (subscription.max_ai_tokens > 0) {
      const blocks = Math.ceil(subscription.max_ai_tokens / 1000000);
      const price = priceMap['ai_tokens'];
      if (price?.stripe_price_id) {
        lineItems.push({
          price: price.stripe_price_id,
          quantity: blocks,
        });
      }
    }

    console.log('Creating subscription with line items:', lineItems);

    // Create subscription in Stripe
    const subscriptionData: any = {
      customer: paymentMethod.stripe_customer_id,
      default_payment_method: paymentMethod.stripe_payment_method_id,
      'metadata[company_id]': company_id,
    };

    // Add line items
    lineItems.forEach((item, index) => {
      subscriptionData[`items[${index}][price]`] = item.price;
      subscriptionData[`items[${index}][quantity]`] = item.quantity.toString();
    });

    const response = await fetch('https://api.stripe.com/v1/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSettings.api_key}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(subscriptionData),
    });

    const stripeSubscription = await response.json();
    if (!response.ok) {
      console.error('Stripe subscription creation error:', stripeSubscription);
      throw new Error(stripeSubscription.error?.message || 'Erro ao criar assinatura');
    }

    console.log('Subscription created:', stripeSubscription.id);

    // Save to database
    await supabaseAdmin.from('stripe_subscriptions').insert({
      company_id: company_id,
      stripe_customer_id: paymentMethod.stripe_customer_id,
      stripe_subscription_id: stripeSubscription.id,
      status: stripeSubscription.status,
      current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
    });

    // Update company status
    await supabaseAdmin
      .from('companies')
      .update({ status: 'active' })
      .eq('id', company_id);

    return new Response(
      JSON.stringify({ 
        success: true,
        subscription_id: stripeSubscription.id,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in create-subscription:', error);
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
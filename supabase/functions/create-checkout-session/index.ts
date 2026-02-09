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
    console.log('Creating checkout session for company:', company_id);

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

    // Get company data
    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('*')
      .eq('id', company_id)
      .single();

    if (!company) {
      throw new Error('Empresa não encontrada');
    }

    // Get or create Stripe customer
    let stripeCustomerId = null;
    const { data: existingPayment } = await supabaseAdmin
      .from('payment_methods')
      .select('stripe_customer_id')
      .eq('company_id', company_id)
      .single();

    if (existingPayment?.stripe_customer_id) {
      stripeCustomerId = existingPayment.stripe_customer_id;
    } else {
      // Create Stripe customer
      const customerResponse = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeSettings.api_key}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          email: company.owner_email,
          name: company.name,
          metadata: JSON.stringify({
            company_id: company_id,
            workspace_id: company.workspace_id,
          }),
        }),
      });

      const customerData = await customerResponse.json();
      if (!customerResponse.ok) {
        console.error('Stripe customer creation error:', customerData);
        throw new Error(customerData.error?.message || 'Erro ao criar cliente no Stripe');
      }

      stripeCustomerId = customerData.id;
      console.log('Created Stripe customer:', stripeCustomerId);
    }

    // Create Checkout Session for setup mode
    const successUrl = `${req.headers.get('origin') || 'https://your-app.com'}/company/schedule?setup=success`;
    const cancelUrl = `${req.headers.get('origin') || 'https://your-app.com'}/company/setup/payment?setup=cancelled`;

    const sessionResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSettings.api_key}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        customer: stripeCustomerId,
        mode: 'setup',
        'payment_method_types[]': 'card',
        success_url: successUrl,
        cancel_url: cancelUrl,
        'metadata[company_id]': company_id,
      }),
    });

    const sessionData = await sessionResponse.json();
    if (!sessionResponse.ok) {
      console.error('Stripe session creation error:', sessionData);
      throw new Error(sessionData.error?.message || 'Erro ao criar sessão de checkout');
    }

    console.log('Checkout session created:', sessionData.id);

    return new Response(
      JSON.stringify({ url: sessionData.url }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in create-checkout-session:', error);
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
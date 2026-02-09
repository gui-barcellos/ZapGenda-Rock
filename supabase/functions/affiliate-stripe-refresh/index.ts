import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData?.user) {
      throw new Error("Usuario nao autenticado");
    }

    const { data: affiliate } = await supabaseAdmin
      .from("affiliates")
      .select("id")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (!affiliate) {
      throw new Error("Afiliado nao encontrado");
    }

    const { data: stripeSettings } = await supabaseAdmin
      .from("stripe_settings")
      .select("api_key")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (!stripeSettings?.api_key) {
      throw new Error("Chave Stripe nao configurada");
    }

    const { data: stripeData } = await supabaseAdmin
      .from("affiliates_stripe")
      .select("*")
      .eq("affiliate_id", affiliate.id)
      .maybeSingle();

    if (!stripeData?.stripe_account_id) {
      throw new Error("Conta Stripe nao encontrada");
    }

    const accountResponse = await fetch(
      `https://api.stripe.com/v1/accounts/${stripeData.stripe_account_id}`,
      {
        headers: {
          Authorization: `Bearer ${stripeSettings.api_key}`,
        },
      }
    );

    const accountData = await accountResponse.json();
    if (!accountResponse.ok) {
      throw new Error(accountData.error?.message || "Erro ao consultar conta Stripe");
    }

    const onboardingStatus = accountData.details_submitted
      ? "submitted"
      : accountData.requirements?.currently_due?.length
        ? "pending"
        : "incomplete";

    await supabaseAdmin.from("affiliates_stripe").upsert({
      affiliate_id: affiliate.id,
      stripe_account_id: stripeData.stripe_account_id,
      charges_enabled: accountData.charges_enabled ?? false,
      payouts_enabled: accountData.payouts_enabled ?? false,
      onboarding_status: onboardingStatus,
    });

    return new Response(
      JSON.stringify({
        charges_enabled: accountData.charges_enabled ?? false,
        payouts_enabled: accountData.payouts_enabled ?? false,
        onboarding_status: onboardingStatus,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

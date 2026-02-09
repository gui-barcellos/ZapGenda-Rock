import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function fetchStripeAccount(apiKey: string, accountId: string) {
  const response = await fetch(`https://api.stripe.com/v1/accounts/${accountId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "Erro ao buscar conta Stripe");
  }
  return data;
}

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
      .select("id, name, email")
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

    const { data: existingStripe } = await supabaseAdmin
      .from("affiliates_stripe")
      .select("*")
      .eq("affiliate_id", affiliate.id)
      .maybeSingle();

    let stripeAccountId = existingStripe?.stripe_account_id || null;

    if (!stripeAccountId) {
      const accountResponse = await fetch("https://api.stripe.com/v1/accounts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeSettings.api_key}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          type: "express",
          "capabilities[card_payments][requested]": "true",
          "capabilities[transfers][requested]": "true",
          email: affiliate.email || "",
          "metadata[affiliate_id]": affiliate.id,
        }),
      });

      const accountData = await accountResponse.json();
      if (!accountResponse.ok) {
        throw new Error(accountData.error?.message || "Erro ao criar conta Stripe");
      }

      stripeAccountId = accountData.id;
    }

    const accountData = await fetchStripeAccount(stripeSettings.api_key, stripeAccountId);

    const origin = req.headers.get("origin") || "https://your-app.com";
    const returnUrl = `${origin}/affiliate/settings?stripe=connected`;
    const refreshUrl = `${origin}/affiliate/settings?stripe=refresh`;

    const linkResponse = await fetch("https://api.stripe.com/v1/account_links", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSettings.api_key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        account: stripeAccountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: "account_onboarding",
      }),
    });

    const linkData = await linkResponse.json();
    if (!linkResponse.ok) {
      throw new Error(linkData.error?.message || "Erro ao criar link Stripe");
    }

    const onboardingStatus = accountData.details_submitted
      ? "submitted"
      : accountData.requirements?.currently_due?.length
        ? "pending"
        : "incomplete";

    await supabaseAdmin.from("affiliates_stripe").upsert({
      affiliate_id: affiliate.id,
      stripe_account_id: stripeAccountId,
      charges_enabled: accountData.charges_enabled ?? false,
      payouts_enabled: accountData.payouts_enabled ?? false,
      onboarding_status: onboardingStatus,
    });

    return new Response(JSON.stringify({ url: linkData.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

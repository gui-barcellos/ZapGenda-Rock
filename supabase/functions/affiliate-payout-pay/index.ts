import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function isSuperuser(supabaseAdmin: any, userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "superuser")
    .maybeSingle();
  if (error) return false;
  return !!data;
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

    const allowed = await isSuperuser(supabaseAdmin, userData.user.id);
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { payout_id } = await req.json();
    if (!payout_id) {
      throw new Error("payout_id obrigatorio");
    }

    const { data: payout, error: payoutError } = await supabaseAdmin
      .from("affiliate_payouts")
      .select(`
        id,
        affiliate_id,
        amount,
        currency,
        status,
        affiliate:affiliates(id, name, email),
        stripe:affiliates_stripe(affiliate_id, stripe_account_id)
      `)
      .eq("id", payout_id)
      .single();

    if (payoutError || !payout) throw payoutError || new Error("Payout nao encontrado");

    if (payout.status !== "approved") {
      throw new Error("Payout precisa estar aprovado");
    }

    const stripeAccountId = payout.stripe?.stripe_account_id;
    if (!stripeAccountId) {
      throw new Error("Afiliado sem conta Stripe conectada");
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

    const amountInCents = Math.round(Number(payout.amount || 0) * 100);
    if (amountInCents <= 0) {
      throw new Error("Valor de payout invalido");
    }

    const transferResponse = await fetch("https://api.stripe.com/v1/transfers", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSettings.api_key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        amount: amountInCents.toString(),
        currency: payout.currency || "brl",
        destination: stripeAccountId,
        "metadata[payout_id]": payout.id,
      }),
    });

    const transferData = await transferResponse.json();
    if (!transferResponse.ok) {
      throw new Error(transferData.error?.message || "Erro ao criar transfer" );
    }

    await supabaseAdmin
      .from("affiliate_payouts")
      .update({ status: "paid", stripe_payout_id: transferData.id })
      .eq("id", payout.id);

    await supabaseAdmin
      .from("affiliate_commissions")
      .update({ status: "paid" })
      .eq("payout_id", payout.id);

    return new Response(JSON.stringify({ ok: true, transfer_id: transferData.id }), {
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

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function startOfCurrentMonthUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    const MIN_PAYOUT_AMOUNT = 0;
    const monthStart = startOfCurrentMonthUtc();

    const { data: commissions, error: commissionError } = await supabaseAdmin
      .from("affiliate_commissions")
      .select("id, affiliate_id, amount, currency, status, period_end")
      .eq("status", "pending")
      .lt("period_end", monthStart.toISOString().split("T")[0]);

    if (commissionError) throw commissionError;

    const grouped = (commissions || []).reduce((acc: Record<string, any>, c: any) => {
      if (!acc[c.affiliate_id]) {
        acc[c.affiliate_id] = {
          affiliate_id: c.affiliate_id,
          amount: 0,
          currency: c.currency || "BRL",
          commissions: [],
        };
      }
      acc[c.affiliate_id].amount += Number(c.amount || 0);
      acc[c.affiliate_id].commissions.push(c.id);
      return acc;
    }, {});

    for (const affiliateId of Object.keys(grouped)) {
      const group = grouped[affiliateId];
      if (group.amount < MIN_PAYOUT_AMOUNT) continue;
      if (group.amount === 0) continue;

      const { data: payout, error: payoutError } = await supabaseAdmin
        .from("affiliate_payouts")
        .insert({
          affiliate_id: affiliateId,
          amount: Number(group.amount.toFixed(2)),
          currency: group.currency,
          status: "pending",
        })
        .select("id")
        .single();

      if (payoutError) throw payoutError;

      if (group.commissions.length > 0 && payout?.id) {
        const { error: updateError } = await supabaseAdmin
          .from("affiliate_commissions")
          .update({ status: "approved", payout_id: payout.id })
          .in("id", group.commissions);
        if (updateError) throw updateError;
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
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

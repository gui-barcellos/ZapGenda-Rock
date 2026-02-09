import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function addMonths(date: Date, months: number) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function startOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function endOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
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

    const body = await req.json().catch(() => ({}));
    const lookbackDays = Number(body?.lookbackDays ?? 45);
    const since = new Date();
    since.setDate(since.getDate() - lookbackDays);

    const { data: invoices, error: invoiceError } = await supabaseAdmin
      .from("invoices")
      .select("id, company_id, amount_total, amount_paid, status, paid_at")
      .eq("status", "paid")
      .gte("paid_at", since.toISOString());

    if (invoiceError) throw invoiceError;

    const results: Array<{ invoice_id: string; created: boolean; reason?: string }> = [];

    for (const invoice of invoices || []) {
      const paidAt = invoice.paid_at ? new Date(invoice.paid_at) : new Date();

      const { data: affiliateLinks, error: affiliateError } = await supabaseAdmin
        .from("affiliate_companies")
        .select(`
          id,
          affiliate_id,
          status,
          commission_start_at,
          commission_end_at,
          cancelled_at,
          affiliate:affiliates(id, status, commission_rate, commission_months)
        `)
        .eq("company_id", invoice.company_id)
        .eq("status", "active")
        .is("cancelled_at", null);

      if (affiliateError) throw affiliateError;

      if (!affiliateLinks || affiliateLinks.length === 0) {
        results.push({ invoice_id: invoice.id, created: false, reason: "no_affiliate" });
        continue;
      }

      for (const link of affiliateLinks) {
        const affiliate = link.affiliate;
        if (!affiliate || affiliate.status !== "active") {
          results.push({ invoice_id: invoice.id, created: false, reason: "inactive_affiliate" });
          continue;
        }

        const rate = Number(affiliate.commission_rate || 0);
        if (rate <= 0) {
          results.push({ invoice_id: invoice.id, created: false, reason: "zero_rate" });
          continue;
        }

        const startAt = link.commission_start_at
          ? new Date(link.commission_start_at)
          : paidAt;
        const endAt = link.commission_end_at
          ? new Date(link.commission_end_at)
          : addMonths(startAt, Number(affiliate.commission_months || 12));

        if (paidAt < startAt || paidAt > endAt) {
          results.push({ invoice_id: invoice.id, created: false, reason: "outside_window" });
          continue;
        }

        const baseAmount = Number(invoice.amount_paid || invoice.amount_total || 0);
        const commissionAmount = Number(((baseAmount * rate) / 100).toFixed(2));
        if (commissionAmount <= 0) {
          results.push({ invoice_id: invoice.id, created: false, reason: "zero_amount" });
          continue;
        }

        const periodStart = startOfMonth(paidAt);
        const periodEnd = endOfMonth(paidAt);

        const { error: insertError } = await supabaseAdmin
          .from("affiliate_commissions")
          .upsert({
            affiliate_id: link.affiliate_id,
            company_id: invoice.company_id,
            invoice_id: invoice.id,
            amount: commissionAmount,
            currency: "BRL",
            status: "pending",
            period_start: periodStart.toISOString().split("T")[0],
            period_end: periodEnd.toISOString().split("T")[0],
          }, { onConflict: "affiliate_id,invoice_id" });

        if (insertError) throw insertError;
        results.push({ invoice_id: invoice.id, created: true });
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
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

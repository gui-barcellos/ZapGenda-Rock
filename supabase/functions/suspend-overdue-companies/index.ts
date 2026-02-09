import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function toDateString(date: Date) {
  return date.toISOString().split("T")[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const today = new Date();
    const todayStr = toDateString(today);
    const graceLimit = new Date(today);
    graceLimit.setDate(graceLimit.getDate() - 7);
    const graceLimitStr = toDateString(graceLimit);

    // Mark invoices as overdue when due_date passed
    await supabase
      .from("invoices")
      .update({ status: "overdue" })
      .in("status", ["open"])
      .lt("due_date", todayStr);

    // Suspend companies past grace period
    const { data: overdueInvoices } = await supabase
      .from("invoices")
      .select("company_id")
      .in("status", ["open", "overdue"])
      .lte("due_date", graceLimitStr);

    const companyIds = Array.from(new Set((overdueInvoices || []).map((row: any) => row.company_id)));

    if (companyIds.length > 0) {
      await supabase
        .from("companies")
        .update({ status: "suspended" })
        .in("id", companyIds);
    }

    return new Response(
      JSON.stringify({
        success: true,
        suspended_companies: companyIds.length,
        grace_limit: graceLimitStr,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

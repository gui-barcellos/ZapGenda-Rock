import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
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

function currentMonthPeriod() {
  const now = new Date();
  return {
    start: startOfMonth(now).toISOString().split("T")[0],
    end: endOfMonth(now).toISOString().split("T")[0],
  };
}

async function createAffiliateCommissionForInvoice(
  supabaseAdmin: any,
  invoice: any,
  companyId: string,
  invoiceId: string
) {
  const paidAt = invoice.status_transitions?.paid_at
    ? new Date(invoice.status_transitions.paid_at * 1000)
    : new Date();

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
    .eq("company_id", companyId)
    .eq("status", "active")
    .is("cancelled_at", null);

  if (affiliateError) throw affiliateError;
  if (!affiliateLinks || affiliateLinks.length === 0) return;

  for (const link of affiliateLinks) {
    const affiliate = link.affiliate;
    if (!affiliate || affiliate.status !== "active") continue;

    const rate = Number(affiliate.commission_rate || 0);
    if (rate <= 0) continue;

    const startAt = link.commission_start_at
      ? new Date(link.commission_start_at)
      : paidAt;
    const endAt = link.commission_end_at
      ? new Date(link.commission_end_at)
      : addMonths(startAt, Number(affiliate.commission_months || 12));

    if (paidAt < startAt || paidAt > endAt) continue;

    const baseAmount = Number(invoice.amount_paid || invoice.amount_due || 0) / 100;
    const commissionAmount = Number(((baseAmount * rate) / 100).toFixed(2));
    if (commissionAmount <= 0) continue;

    const periodStart = startOfMonth(paidAt);
    const periodEnd = endOfMonth(paidAt);

    const { error: insertError } = await supabaseAdmin
      .from("affiliate_commissions")
      .upsert({
        affiliate_id: link.affiliate_id,
        company_id: companyId,
        invoice_id: invoiceId,
        amount: commissionAmount,
        currency: "BRL",
        status: "pending",
        period_start: periodStart.toISOString().split("T")[0],
        period_end: periodEnd.toISOString().split("T")[0],
      }, { onConflict: "affiliate_id,invoice_id" });

    if (insertError) throw insertError;
  }
}

async function reverseAffiliateCommissionForCharge(supabaseAdmin: any, chargeId: string) {
  const { data: invoice } = await supabaseAdmin
    .from("invoices")
    .select("id, company_id")
    .eq("stripe_charge_id", chargeId)
    .maybeSingle();

  if (!invoice) return;

  const { data: commissions, error } = await supabaseAdmin
    .from("affiliate_commissions")
    .select("id, affiliate_id, company_id, amount, currency, status")
    .eq("invoice_id", invoice.id)
    .neq("status", "reversed");

  if (error) throw error;
  if (!commissions || commissions.length === 0) return;

  const { start, end } = currentMonthPeriod();

  for (const commission of commissions) {
    await supabaseAdmin
      .from("affiliate_commissions")
      .update({ status: "reversed" })
      .eq("id", commission.id);

    if (commission.status === "paid") {
      await supabaseAdmin
        .from("affiliate_commissions")
        .insert({
          affiliate_id: commission.affiliate_id,
          company_id: commission.company_id,
          invoice_id: null,
          amount: -Math.abs(Number(commission.amount || 0)),
          currency: commission.currency || "BRL",
          status: "pending",
          period_start: start,
          period_end: end,
        });
    }
  }
}

function getOnboardingStatus(account: any) {
  if (account.details_submitted) return "submitted";
  if (account.requirements?.currently_due?.length) return "pending";
  return "incomplete";
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
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const body = await req.text();

    console.log("Received webhook event");

    // Parse webhook event (in production, verify signature with webhook secret)
    const event = JSON.parse(body);
    console.log("Event type:", event.type);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const companyId = session.metadata?.company_id;

        console.log("Checkout session completed for company:", companyId);

        if (session.mode === "setup" && session.setup_intent) {
          // Get setup intent to retrieve payment method
          const { data: stripeSettings } = await supabaseAdmin
            .from("stripe_settings")
            .select("api_key")
            .order("updated_at", { ascending: false })
            .limit(1)
            .single();

          if (!stripeSettings?.api_key) {
            throw new Error("Stripe settings not found");
          }

          const setupIntentResponse = await fetch(
            `https://api.stripe.com/v1/setup_intents/${session.setup_intent}`,
            {
              headers: {
                Authorization: `Bearer ${stripeSettings.api_key}`,
              },
            }
          );

          const setupIntent = await setupIntentResponse.json();
          const paymentMethodId = setupIntent.payment_method;

          if (paymentMethodId) {
            // Get payment method details
            const pmResponse = await fetch(
              `https://api.stripe.com/v1/payment_methods/${paymentMethodId}`,
              {
                headers: {
                  Authorization: `Bearer ${stripeSettings.api_key}`,
                },
              }
            );

            const paymentMethod = await pmResponse.json();

            // Save payment method
            await supabaseAdmin.from("payment_methods").upsert({
              company_id: companyId,
              stripe_customer_id: session.customer,
              stripe_payment_method_id: paymentMethodId,
              card_brand: paymentMethod.card?.brand,
              card_last4: paymentMethod.card?.last4,
              card_exp_month: paymentMethod.card?.exp_month,
              card_exp_year: paymentMethod.card?.exp_year,
              is_default: true,
            });

            console.log("Payment method saved:", paymentMethodId);

            // Update company status to active if in trial
            const { data: company } = await supabaseAdmin
              .from("companies")
              .select("status")
              .eq("id", companyId)
              .single();

            if (company?.status === "trial") {
              await supabaseAdmin
                .from("companies")
                .update({ status: "active" })
                .eq("id", companyId);

              console.log("Company activated:", companyId);
            }
          }
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object;
        const companyId = invoice.metadata?.company_id;

        console.log("Invoice paid for company:", companyId);

        // Update invoice in database
        const { data: invoiceRow, error: invoiceError } = await supabaseAdmin
          .from("invoices")
          .upsert({
            company_id: companyId,
            stripe_invoice_id: invoice.id,
            stripe_charge_id: invoice.charge,
            amount_total: invoice.amount_due / 100,
            amount_paid: invoice.amount_paid / 100,
            status: "paid",
            paid_at: new Date(invoice.status_transitions.paid_at * 1000).toISOString(),
            due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString().split("T")[0] : null,
            billing_reason: invoice.billing_reason,
            invoice_pdf_url: invoice.invoice_pdf,
            attempt_count: invoice.attempt_count || 0,
          })
          .select("id")
          .single();

        if (invoiceError) throw invoiceError;

        // Update company status to active
        await supabaseAdmin
          .from("companies")
          .update({ status: "active" })
          .eq("id", companyId);

        // Generate affiliate commission
        if (invoiceRow?.id) {
          await createAffiliateCommissionForInvoice(supabaseAdmin, invoice, companyId, invoiceRow.id);
        }

        console.log("Invoice updated, company activated, commission generated");
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const companyId = invoice.metadata?.company_id;

        console.log("Invoice payment failed for company:", companyId);

        // Update invoice in database
        await supabaseAdmin.from("invoices").upsert({
          company_id: companyId,
          stripe_invoice_id: invoice.id,
          amount_total: invoice.amount_due / 100,
          amount_paid: 0,
          status: "open",
          due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString().split("T")[0] : null,
          billing_reason: invoice.billing_reason,
          invoice_pdf_url: invoice.invoice_pdf,
          attempt_count: invoice.attempt_count || 0,
        });

        break;
      }

      case "charge.refunded": {
        const charge = event.data.object;
        await reverseAffiliateCommissionForCharge(supabaseAdmin, charge.id);
        break;
      }

      case "charge.dispute.created": {
        const dispute = event.data.object;
        await reverseAffiliateCommissionForCharge(supabaseAdmin, dispute.charge);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const companyId = subscription.metadata?.company_id;

        console.log("Subscription updated for company:", companyId);

        // Update subscription in database
        await supabaseAdmin.from("stripe_subscriptions").upsert({
          company_id: companyId,
          stripe_customer_id: subscription.customer,
          stripe_subscription_id: subscription.id,
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        });

        console.log("Subscription saved:", subscription.id);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const companyId = subscription.metadata?.company_id;

        console.log("Subscription deleted for company:", companyId);

        // Update subscription status
        await supabaseAdmin
          .from("stripe_subscriptions")
          .update({ status: "canceled" })
          .eq("stripe_subscription_id", subscription.id);

        // Suspend company
        await supabaseAdmin
          .from("companies")
          .update({ status: "suspended" })
          .eq("id", companyId);

        // Mark affiliate linkage as cancelled but keep current period for final commission
        let finalCommissionEnd = new Date().toISOString();
        if (subscription.current_period_end) {
          finalCommissionEnd = new Date(subscription.current_period_end * 1000).toISOString();
        }

        await supabaseAdmin
          .from("affiliate_companies")
          .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
            commission_end_at: finalCommissionEnd,
          })
          .eq("company_id", companyId);

        console.log("Subscription canceled, company suspended, affiliate marked");
        break;
      }

      case "account.updated": {
        const account = event.data.object;
        const status = getOnboardingStatus(account);

        await supabaseAdmin
          .from("affiliates_stripe")
          .update({
            charges_enabled: account.charges_enabled ?? false,
            payouts_enabled: account.payouts_enabled ?? false,
            onboarding_status: status,
          })
          .eq("stripe_account_id", account.id);

        console.log("Affiliate Stripe account updated:", account.id);
        break;
      }

      case "account.application.deauthorized": {
        const account = event.data.object;
        await supabaseAdmin
          .from("affiliates_stripe")
          .update({
            charges_enabled: false,
            payouts_enabled: false,
            onboarding_status: "deauthorized",
          })
          .eq("stripe_account_id", account.id);
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in stripe-webhooks:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type BillingStatus = "ok" | "grace" | "blocked";

interface BillingInfo {
  status: BillingStatus;
  dueDate: string | null;
  daysPastDue: number;
  daysRemaining: number;
}

function parseDateOnly(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`);
}

export function useBillingStatus() {
  return useQuery({
    queryKey: ["billing-status"],
    queryFn: async (): Promise<BillingInfo> => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) {
        return { status: "ok", dueDate: null, daysPastDue: 0, daysRemaining: 0 };
      }

      const { data: invoice } = await supabase
        .from("invoices")
        .select("status, due_date")
        .eq("company_id", profile.company_id)
        .in("status", ["open", "overdue"])
        .order("due_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!invoice?.due_date) {
        return { status: "ok", dueDate: null, daysPastDue: 0, daysRemaining: 0 };
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const due = parseDateOnly(invoice.due_date);
      const diffMs = today.getTime() - due.getTime();
      const daysPastDue = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (daysPastDue <= 0) {
        return { status: "ok", dueDate: invoice.due_date, daysPastDue: 0, daysRemaining: 7 };
      }

      if (daysPastDue > 7) {
        return { status: "blocked", dueDate: invoice.due_date, daysPastDue, daysRemaining: 0 };
      }

      return {
        status: "grace",
        dueDate: invoice.due_date,
        daysPastDue,
        daysRemaining: Math.max(0, 7 - daysPastDue),
      };
    },
  });
}

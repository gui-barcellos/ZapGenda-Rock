import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth } from "date-fns";

export const useDashboardMetrics = () => {
  const activeCompanies = useQuery({
    queryKey: ['dashboard-active-companies'],
    queryFn: async () => {
      const { count } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      return count || 0;
    },
    refetchInterval: 30000,
  });

  const mrr = useQuery({
    queryKey: ['dashboard-mrr'],
    queryFn: async () => {
      const monthStart = startOfMonth(new Date()).toISOString();
      const { data } = await supabase
        .from('invoices')
        .select('amount_total')
        .eq('status', 'paid')
        .gte('created_at', monthStart);
      return data?.reduce((sum, inv) => sum + Number(inv.amount_total), 0) || 0;
    },
    refetchInterval: 30000,
  });

  const tokensUsed = useQuery({
    queryKey: ['dashboard-tokens'],
    queryFn: async () => {
      const monthStart = startOfMonth(new Date()).toISOString();
      const { data } = await supabase
        .from('ai_token_usage')
        .select('tokens_used')
        .gte('created_at', monthStart);
      return data?.reduce((sum, t) => sum + t.tokens_used, 0) || 0;
    },
    refetchInterval: 30000,
  });

  const openTickets = useQuery({
    queryKey: ['dashboard-tickets'],
    queryFn: async () => {
      const { count } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open');
      return count || 0;
    },
    refetchInterval: 30000,
  });

  return {
    activeCompanies: activeCompanies.data,
    mrr: mrr.data,
    tokensUsed: tokensUsed.data,
    openTickets: openTickets.data,
    isLoading: activeCompanies.isLoading || mrr.isLoading || tokensUsed.isLoading || openTickets.isLoading,
  };
};

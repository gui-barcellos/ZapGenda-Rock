import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, subDays, subMonths, startOfYear } from "date-fns";

export type PeriodOption = '7days' | '30days' | 'currentMonth' | 'lastMonth' | '3months' | '6months' | 'currentYear';

const getPeriodDates = (period: PeriodOption) => {
  const now = new Date();
  
  switch (period) {
    case '7days':
      return { start: subDays(now, 7).toISOString(), end: now.toISOString() };
    case '30days':
      return { start: subDays(now, 30).toISOString(), end: now.toISOString() };
    case 'currentMonth':
      return { start: startOfMonth(now).toISOString(), end: endOfMonth(now).toISOString() };
    case 'lastMonth': {
      const lastMonth = subMonths(now, 1);
      return { start: startOfMonth(lastMonth).toISOString(), end: endOfMonth(lastMonth).toISOString() };
    }
    case '3months':
      return { start: subMonths(now, 3).toISOString(), end: now.toISOString() };
    case '6months':
      return { start: subMonths(now, 6).toISOString(), end: now.toISOString() };
    case 'currentYear':
      return { start: startOfYear(now).toISOString(), end: now.toISOString() };
    default:
      return { start: startOfMonth(now).toISOString(), end: endOfMonth(now).toISOString() };
  }
};

export const useTokensAnalytics = (period: PeriodOption = 'currentMonth') => {
  return useQuery({
    queryKey: ['tokens-analytics', period],
    queryFn: async () => {
      const { start: monthStart, end: monthEnd } = getPeriodDates(period);

      // Total de tokens usados este mês
      const { data: totalTokensData } = await supabase
        .from('ai_token_usage')
        .select('tokens_used')
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd);

      const totalTokens = totalTokensData?.reduce((sum, t) => sum + t.tokens_used, 0) || 0;

      // Empresas usando IA e estatísticas
      const { data: companiesData } = await supabase
        .from('company_subscriptions')
        .select('company_id, current_ai_tokens, max_ai_tokens, companies(name)')
        .gt('current_ai_tokens', 0);

      const activeCompanies = companiesData?.length || 0;
      const nearLimit = companiesData?.filter(c => 
        (c.current_ai_tokens / c.max_ai_tokens) >= 0.8 && 
        (c.current_ai_tokens / c.max_ai_tokens) < 1
      ).length || 0;
      const exceededLimit = companiesData?.filter(c => 
        c.current_ai_tokens >= c.max_ai_tokens
      ).length || 0;

      // Tokens por tipo de operação
      const { data: operationData } = await supabase
        .from('ai_token_usage')
        .select('operation_type, tokens_used')
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd);

      const tokensByOperation = operationData?.reduce((acc, curr) => {
        const type = curr.operation_type || 'other';
        acc[type] = (acc[type] || 0) + curr.tokens_used;
        return acc;
      }, {} as Record<string, number>) || {};

      // Top 10 empresas por consumo
      const topCompanies = companiesData
        ?.map(c => ({
          companyId: c.company_id,
          companyName: (c.companies as any)?.name || 'N/A',
          tokensUsed: c.current_ai_tokens,
          maxTokens: c.max_ai_tokens,
          percentage: (c.current_ai_tokens / c.max_ai_tokens) * 100,
        }))
        .sort((a, b) => b.tokensUsed - a.tokensUsed)
        .slice(0, 20) || [];

      return {
        totalTokens,
        activeCompanies,
        nearLimit,
        exceededLimit,
        tokensByOperation,
        topCompanies,
      };
    },
    refetchInterval: 30000, // Auto-refresh a cada 30s
  });
};

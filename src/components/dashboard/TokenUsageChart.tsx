import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { subDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TokenUsageChartProps {
  companyId?: string;
}

export const TokenUsageChart = ({ companyId }: TokenUsageChartProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ['token-usage', companyId],
    queryFn: async () => {
      const days = [];
      for (let i = 29; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const start = new Date(date.setHours(0, 0, 0, 0)).toISOString();
        const end = new Date(date.setHours(23, 59, 59, 999)).toISOString();

        let query = supabase
          .from('ai_token_usage')
          .select('tokens_used')
          .gte('created_at', start)
          .lte('created_at', end);

        if (companyId) {
          query = query.eq('company_id', companyId);
        }

        const { data } = await query;

        const total = data?.reduce((sum, t) => sum + t.tokens_used, 0) || 0;
        
        days.push({
          date: format(date, 'dd/MM', { locale: ptBR }),
          tokens: total,
        });
      }
      return days;
    },
    refetchInterval: 60000,
  });

  const chartConfig = {
    tokens: {
      label: "Tokens",
      color: "hsl(var(--primary))",
    },
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Uso de Tokens IA</CardTitle>
          <CardDescription>Últimos 30 dias</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Uso de Tokens IA</CardTitle>
        <CardDescription>
          {companyId ? 'Consumo diário da empresa' : 'Consumo diário do sistema'} - Últimos 30 dias
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              className="text-xs"
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              className="text-xs"
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line 
              type="monotone" 
              dataKey="tokens" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

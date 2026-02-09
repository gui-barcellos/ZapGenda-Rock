import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AppointmentsChartProps {
  data: Array<{ date: string; count: number; revenue: number }>;
}

export const AppointmentsChart = ({ data }: AppointmentsChartProps) => {
  const chartData = data.map(item => ({
    ...item,
    dateFormatted: format(new Date(item.date), "dd/MM", { locale: ptBR })
  }));

  const chartConfig = {
    count: {
      label: "Agendamentos",
      color: "hsl(var(--chart-1))",
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agendamentos por Dia</CardTitle>
        <CardDescription>Distribuição de agendamentos no período</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="dateFormatted"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey="count"
              stroke="hsl(var(--chart-1))"
              fill="hsl(var(--chart-1))"
              fillOpacity={0.2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

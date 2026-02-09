import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface TokensByOperationChartProps {
  data: Record<string, number>;
  isLoading?: boolean;
}

export const TokensByOperationChart = ({ data, isLoading }: TokensByOperationChartProps) => {
  const chartData = Object.entries(data).map(([name, value]) => ({
    name: name === 'chat' ? 'Chat IA' : name === 'transcription' ? 'Transcrição' : 'Outros',
    value,
  }));

  const chartConfig = {
    chat: {
      label: "Chat IA",
      color: "hsl(var(--primary))",
    },
    transcription: {
      label: "Transcrição",
      color: "hsl(var(--secondary))",
    },
    other: {
      label: "Outros",
      color: "hsl(var(--muted))",
    },
  };

  const COLORS = [
    "hsl(var(--primary))",
    "hsl(var(--secondary))",
    "hsl(var(--muted))",
  ];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tokens por Operação</CardTitle>
          <CardDescription>Distribuição por tipo</CardDescription>
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
        <CardTitle>Tokens por Operação</CardTitle>
        <CardDescription>Distribuição por tipo de uso</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="hsl(var(--primary))"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

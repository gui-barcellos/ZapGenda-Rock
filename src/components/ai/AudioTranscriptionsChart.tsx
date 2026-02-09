import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AudioTranscriptionsChartProps {
  data: Array<{ date: string; count: number }>;
}

export const AudioTranscriptionsChart = ({ data }: AudioTranscriptionsChartProps) => {
  const chartData = data.map(item => ({
    date: format(new Date(item.date), "dd/MM", { locale: ptBR }),
    count: item.count,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transcrições de Áudio por Dia</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="count"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              name="Transcrições"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

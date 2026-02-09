import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface ProfessionalsPerformanceProps {
  data: Array<{
    professional: string;
    total: number;
    completed: number;
    cancelled: number;
    revenue: number;
  }>;
}

export const ProfessionalsPerformance = ({ data }: ProfessionalsPerformanceProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance por Profissional</CardTitle>
        <CardDescription>Estatísticas de atendimento de cada profissional</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Profissional</TableHead>
              <TableHead className="text-center">Total</TableHead>
              <TableHead className="text-center">Concluídos</TableHead>
              <TableHead className="text-center">Cancelados</TableHead>
              <TableHead className="text-right">Receita</TableHead>
              <TableHead className="text-center">Taxa</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((prof) => {
              const successRate = prof.total > 0 
                ? ((prof.completed / prof.total) * 100).toFixed(0)
                : '0';
              
              return (
                <TableRow key={prof.professional}>
                  <TableCell className="font-medium">{prof.professional}</TableCell>
                  <TableCell className="text-center">{prof.total}</TableCell>
                  <TableCell className="text-center">{prof.completed}</TableCell>
                  <TableCell className="text-center">{prof.cancelled}</TableCell>
                  <TableCell className="text-right">R$ {prof.revenue.toFixed(2)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={Number(successRate) >= 80 ? "default" : "secondary"}>
                      {successRate}%
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

import { Card } from "@/components/ui/card";
import { FileText, CheckCircle, Clock, AlertCircle, TrendingUp, DollarSign } from "lucide-react";

interface InvoiceStatsProps {
  total: number;
  paid: number;
  pending: number;
  overdue: number;
  totalRevenue: number;
  pendingRevenue: number;
}

export const InvoiceStats = ({
  total,
  paid,
  pending,
  overdue,
  totalRevenue,
  pendingRevenue,
}: InvoiceStatsProps) => {
  const stats = [
    {
      label: "Total de Faturas",
      value: total,
      icon: FileText,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Faturas Pagas",
      value: paid,
      icon: CheckCircle,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      label: "Pendentes",
      value: pending,
      icon: Clock,
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
    },
    {
      label: "Vencidas",
      value: overdue,
      icon: AlertCircle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      label: "Receita Total",
      value: `R$ ${(totalRevenue / 1000).toFixed(1)}k`,
      icon: TrendingUp,
      color: "text-chart-1",
      bgColor: "bg-chart-1/10",
    },
    {
      label: "Receita Pendente",
      value: `R$ ${(pendingRevenue / 1000).toFixed(1)}k`,
      icon: DollarSign,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat) => (
        <Card key={stat.label} className="p-6">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </p>
              <p className="text-2xl font-bold mt-2">{stat.value}</p>
            </div>
            <div className={`${stat.bgColor} p-3 rounded-lg`}>
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

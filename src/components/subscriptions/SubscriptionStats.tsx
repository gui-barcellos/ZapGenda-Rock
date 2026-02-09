import { Card } from "@/components/ui/card";
import { Building2, TrendingUp, Users, Package } from "lucide-react";

interface SubscriptionStatsProps {
  totalCompanies: number;
  activeCompanies: number;
  trialCompanies: number;
  totalRevenue: number;
}

export const SubscriptionStats = ({
  totalCompanies,
  activeCompanies,
  trialCompanies,
  totalRevenue,
}: SubscriptionStatsProps) => {
  const stats = [
    {
      label: "Total de Empresas",
      value: totalCompanies,
      icon: Building2,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Empresas Ativas",
      value: activeCompanies,
      icon: Users,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      label: "Em Trial",
      value: trialCompanies,
      icon: Package,
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
    },
    {
      label: "Receita Mensal",
      value: `R$ ${(totalRevenue / 1000).toFixed(1)}k`,
      icon: TrendingUp,
      color: "text-chart-1",
      bgColor: "bg-chart-1/10",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

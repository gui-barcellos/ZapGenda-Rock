import SuperUserLayout from "@/components/layout/SuperUserLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { MonthlyRevenueChart } from "@/components/dashboard/MonthlyRevenueChart";
import { CompanyStatusChart } from "@/components/dashboard/CompanyStatusChart";
import { TokenUsageChart } from "@/components/dashboard/TokenUsageChart";
import { RecentActivities } from "@/components/dashboard/RecentActivities";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { Building2, DollarSign, Cpu, MessageSquare } from "lucide-react";

const Dashboard = () => {
  const { activeCompanies, mrr, tokensUsed, openTickets, isLoading } = useDashboardMetrics();

  return (
    <SuperUserLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Visão geral completa do sistema Marca Pra Mim
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Empresas Ativas"
            description="Total de clientes"
            value={activeCompanies || 0}
            icon={Building2}
            isLoading={isLoading}
          />
          <MetricCard
            title="Receita Mensal"
            description="MRR atual"
            value={new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            }).format(mrr || 0)}
            icon={DollarSign}
            isLoading={isLoading}
          />
          <MetricCard
            title="Tokens Utilizados"
            description="Este mês"
            value={(tokensUsed || 0).toLocaleString('pt-BR')}
            icon={Cpu}
            isLoading={isLoading}
          />
          <MetricCard
            title="Suporte Abertos"
            description="Tickets pendentes"
            value={openTickets || 0}
            icon={MessageSquare}
            isLoading={isLoading}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <MonthlyRevenueChart />
          <CompanyStatusChart />
        </div>

        <TokenUsageChart />

        <RecentActivities />
      </div>
    </SuperUserLayout>
  );
};

export default Dashboard;

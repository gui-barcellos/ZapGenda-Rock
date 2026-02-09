import { MetricCard } from "@/components/dashboard/MetricCard";
import { Calendar, CheckCircle, XCircle, DollarSign, Users, TrendingUp } from "lucide-react";

interface ReportMetricsProps {
  metrics: {
    totalAppointments: number;
    confirmedAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    totalRevenue: number;
    newPatientsCount: number;
    attendanceRate: string;
  };
  isLoading?: boolean;
}

export const ReportMetrics = ({ metrics, isLoading }: ReportMetricsProps) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total de Agendamentos"
        description="No período selecionado"
        value={metrics.totalAppointments}
        icon={Calendar}
        isLoading={isLoading}
      />
      <MetricCard
        title="Agendamentos Concluídos"
        description="Atendimentos realizados"
        value={metrics.completedAppointments}
        icon={CheckCircle}
        isLoading={isLoading}
      />
      <MetricCard
        title="Receita Total"
        description="Dos atendimentos concluídos"
        value={`R$ ${metrics.totalRevenue.toFixed(2)}`}
        icon={DollarSign}
        isLoading={isLoading}
      />
      <MetricCard
        title="Taxa de Comparecimento"
        description="Percentual de conclusão"
        value={`${metrics.attendanceRate}%`}
        icon={TrendingUp}
        isLoading={isLoading}
      />
      <MetricCard
        title="Novos Clientes"
        description="Cadastrados no período"
        value={metrics.newPatientsCount}
        icon={Users}
        isLoading={isLoading}
      />
      <MetricCard
        title="Cancelamentos"
        description="Agendamentos cancelados"
        value={metrics.cancelledAppointments}
        icon={XCircle}
        isLoading={isLoading}
      />
    </div>
  );
};

import { useState } from "react";
import CompanyLayout from "@/components/layout/CompanyLayout";
import { PeriodFilter, PeriodOption } from "@/components/dashboard/PeriodFilter";
import { ReportMetrics } from "@/components/reports/ReportMetrics";
import { AppointmentsChart } from "@/components/reports/AppointmentsChart";
import { RevenueChart } from "@/components/reports/RevenueChart";
import { ProfessionalsPerformance } from "@/components/reports/ProfessionalsPerformance";
import { useReports } from "@/hooks/useReports";
import { Skeleton } from "@/components/ui/skeleton";

const Reports = () => {
  const [period, setPeriod] = useState<PeriodOption>('currentMonth');
  const { data, isLoading } = useReports(period);

  return (
    <CompanyLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
            <p className="text-muted-foreground mt-2">
              Visualize relatórios e estatísticas do período selecionado
            </p>
          </div>
          <PeriodFilter value={period} onChange={setPeriod} />
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
            <Skeleton className="h-[400px]" />
          </div>
        ) : data ? (
          <>
            <ReportMetrics metrics={data.metrics} />
            
            <div className="grid gap-6 md:grid-cols-2">
              <AppointmentsChart data={data.appointmentsByDate as any} />
              <RevenueChart data={data.revenueByService as any} />
            </div>

            <ProfessionalsPerformance data={data.appointmentsByProfessional as any} />
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum dado disponível para o período selecionado
          </div>
        )}
      </div>
    </CompanyLayout>
  );
};

export default Reports;

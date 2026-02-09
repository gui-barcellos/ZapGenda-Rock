import { useState } from "react";
import SuperUserLayout from "@/components/layout/SuperUserLayout";
import { TokensStatsCards } from "@/components/dashboard/TokensStatsCards";
import { TokenUsageChart } from "@/components/dashboard/TokenUsageChart";
import { TokensByOperationChart } from "@/components/dashboard/TokensByOperationChart";
import { TopCompaniesTable } from "@/components/dashboard/TopCompaniesTable";
import { PeriodFilter, PeriodOption } from "@/components/dashboard/PeriodFilter";
import { useTokensAnalytics } from "@/hooks/useTokensAnalytics";

const Tokens = () => {
  const [period, setPeriod] = useState<PeriodOption>('currentMonth');
  const { data, isLoading } = useTokensAnalytics(period);

  return (
    <SuperUserLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Uso de Tokens de IA</h1>
            <p className="text-muted-foreground mt-2">
              Monitore o consumo de tokens de IA em todo o sistema
            </p>
          </div>
          <PeriodFilter value={period} onChange={setPeriod} />
        </div>

        <TokensStatsCards
          totalTokens={data?.totalTokens || 0}
          activeCompanies={data?.activeCompanies || 0}
          nearLimit={data?.nearLimit || 0}
          exceededLimit={data?.exceededLimit || 0}
          isLoading={isLoading}
        />

        <div className="grid gap-6 md:grid-cols-2">
          <TokenUsageChart />
          <TokensByOperationChart 
            data={data?.tokensByOperation || {}} 
            isLoading={isLoading}
          />
        </div>

        <TopCompaniesTable 
          companies={data?.topCompanies || []} 
          isLoading={isLoading}
        />
      </div>
    </SuperUserLayout>
  );
};

export default Tokens;

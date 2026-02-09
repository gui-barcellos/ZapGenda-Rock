import { MetricCard } from "./MetricCard";
import { Cpu, Building2, AlertTriangle, Ban } from "lucide-react";

interface TokensStatsCardsProps {
  totalTokens: number;
  activeCompanies: number;
  nearLimit: number;
  exceededLimit: number;
  isLoading?: boolean;
}

export const TokensStatsCards = ({
  totalTokens,
  activeCompanies,
  nearLimit,
  exceededLimit,
  isLoading,
}: TokensStatsCardsProps) => {
  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total de Tokens"
        description="Consumo este mês"
        value={formatTokens(totalTokens)}
        icon={Cpu}
        isLoading={isLoading}
      />
      <MetricCard
        title="Empresas Ativas"
        description="Usando IA"
        value={activeCompanies}
        icon={Building2}
        isLoading={isLoading}
      />
      <MetricCard
        title="Próximas do Limite"
        description=">80% do limite"
        value={nearLimit}
        icon={AlertTriangle}
        isLoading={isLoading}
      />
      <MetricCard
        title="Excederam Limite"
        description="Limite atingido"
        value={exceededLimit}
        icon={Ban}
        isLoading={isLoading}
      />
    </div>
  );
};

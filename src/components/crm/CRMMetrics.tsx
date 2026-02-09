import { CRMContact } from "@/hooks/useCRM";
import { Card } from "@/components/ui/card";
import { Users, TrendingUp, DollarSign, Clock } from "lucide-react";

interface CRMMetricsProps {
  contacts: CRMContact[] | undefined;
}

export const CRMMetrics = ({ contacts }: CRMMetricsProps) => {
  const totalLeads = contacts?.length || 0;
  
  const wonDeals = contacts?.filter(
    (c) => c.funnel_stage === "cliente_ganho"
  ).length || 0;
  
  const conversionRate = totalLeads > 0 ? ((wonDeals / totalLeads) * 100).toFixed(1) : "0";
  
  const totalValue = contacts?.reduce(
    (sum, contact) => sum + (contact.estimated_value || 0),
    0
  ) || 0;
  
  const averageTime = contacts && contacts.length > 0
    ? contacts.reduce((sum, contact) => {
        const created = new Date(contact.created_at);
        const moved = new Date(contact.moved_to_stage_at);
        const days = Math.floor(
          (moved.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
        );
        return sum + days;
      }, 0) / contacts.length
    : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total de Leads</p>
            <p className="text-2xl font-bold">{totalLeads}</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <TrendingUp className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
            <p className="text-2xl font-bold">{conversionRate}%</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <DollarSign className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Valor Total</p>
            <p className="text-2xl font-bold">R$ {totalValue.toFixed(2)}</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <Clock className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Tempo Médio</p>
            <p className="text-2xl font-bold">{averageTime.toFixed(0)} dias</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

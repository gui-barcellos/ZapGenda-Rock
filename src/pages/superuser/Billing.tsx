import SuperUserLayout from "@/components/layout/SuperUserLayout";
import { InvoiceStats } from "@/components/billing/InvoiceStats";
import { InvoicesTable } from "@/components/billing/InvoicesTable";
import { useInvoiceStats } from "@/hooks/useInvoices";
import { Receipt } from "lucide-react";

const Billing = () => {
  const { data: stats, isLoading } = useInvoiceStats();

  return (
    <SuperUserLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Receipt className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Faturamento</h1>
            </div>
            <p className="text-muted-foreground mt-2">
              Acompanhe o faturamento e receitas do sistema
            </p>
          </div>
        </div>

        {!isLoading && stats && (
          <InvoiceStats
            total={stats.total}
            paid={stats.paid}
            pending={stats.pending}
            overdue={stats.overdue}
            totalRevenue={stats.totalRevenue}
            pendingRevenue={stats.pendingRevenue}
          />
        )}

        <InvoicesTable />
      </div>
    </SuperUserLayout>
  );
};

export default Billing;

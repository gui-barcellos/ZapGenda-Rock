import SuperUserLayout from "@/components/layout/SuperUserLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubscriptionStats } from "@/components/subscriptions/SubscriptionStats";
import { ActivePlansTab } from "@/components/subscriptions/ActivePlansTab";
import { ResourcePricesTab } from "@/components/subscriptions/ResourcePricesTab";
import { PlanTemplatesTab } from "@/components/subscriptions/PlanTemplatesTab";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { CreditCard } from "lucide-react";

const Subscriptions = () => {
  const { data: subscriptions, isLoading } = useSubscriptions();

  // Calculate statistics
  const totalCompanies = subscriptions?.length || 0;
  const activeCompanies = subscriptions?.filter(s => s.companies?.status === 'active').length || 0;
  const trialCompanies = subscriptions?.filter(s => s.companies?.status === 'trial').length || 0;
  const totalRevenue = subscriptions?.reduce((sum, s) => sum + (s.monthly_revenue || 0), 0) || 0;

  return (
    <SuperUserLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Assinaturas</h1>
            </div>
            <p className="text-muted-foreground mt-2">
              Gerencie os planos e assinaturas das empresas
            </p>
          </div>
        </div>

        {!isLoading && (
          <SubscriptionStats
            totalCompanies={totalCompanies}
            activeCompanies={activeCompanies}
            trialCompanies={trialCompanies}
            totalRevenue={totalRevenue}
          />
        )}

        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="active">Planos Ativos</TabsTrigger>
            <TabsTrigger value="prices">Preços</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            <ActivePlansTab />
          </TabsContent>

          <TabsContent value="prices" className="space-y-4">
            <ResourcePricesTab />
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <PlanTemplatesTab />
          </TabsContent>
        </Tabs>
      </div>
    </SuperUserLayout>
  );
};

export default Subscriptions;

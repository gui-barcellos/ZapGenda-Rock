import CompanyLayout from "@/components/layout/CompanyLayout";
import { CRMKanban } from "@/components/crm/CRMKanban";
import { CRMMetrics } from "@/components/crm/CRMMetrics";
import { CRMFilters } from "@/components/crm/CRMFilters";
import { useCRMContacts, CRMFilters as CRMFiltersType } from "@/hooks/useCRM";
import { useCRMStages } from "@/hooks/useCRMStages";
import { useCompanyData } from "@/hooks/useCompanyData";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const CRM = () => {
  const [filters, setFilters] = useState<CRMFiltersType>({});
  const [isInitializing, setIsInitializing] = useState(false);
  const { companyData } = useCompanyData();
  const companyId = companyData?.id;
  const { data: contacts, isLoading } = useCRMContacts(filters);
  const { data: stages, isLoading: stagesLoading } = useCRMStages(companyId);
  const queryClient = useQueryClient();

  const handleInitializeCRM = async () => {
    if (!companyId) return;
    
    setIsInitializing(true);
    try {
      const { error } = await supabase.rpc("ensure_default_crm_stages", {
        _company_id: companyId,
      });

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["crm-stages", companyId] });
      toast({ title: "CRM inicializado com sucesso!" });
    } catch (error: any) {
      toast({
        title: "Erro ao inicializar CRM",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <CompanyLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">CRM</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie seu pipeline de vendas
            </p>
          </div>
          <CRMFilters onFilterChange={setFilters} />
        </div>

        <CRMMetrics contacts={contacts} />

        {!stagesLoading && stages?.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Configurar pipeline do CRM</CardTitle>
              <CardDescription>
                Sua empresa ainda não tem estágios de vendas configurados. Clique no botão abaixo para criar os estágios padrão.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleInitializeCRM} disabled={isInitializing}>
                {isInitializing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Inicializar CRM
              </Button>
            </CardContent>
          </Card>
        ) : (
          <CRMKanban contacts={contacts} stages={stages} isLoading={isLoading} />
        )}
      </div>
    </CompanyLayout>
  );
};

export default CRM;

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
import { GuidedEmptyState } from "@/components/company/GuidedEmptyState";
import { Loader2, Rows3 } from "lucide-react";

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
        ) : !isLoading && (contacts?.length || 0) === 0 ? (
          <GuidedEmptyState
            icon={Rows3}
            title="Seu pipeline está pronto, mas ainda sem leads"
            description="Assim que você cadastrar ou importar contatos, já pode arrastar cada lead entre os estágios e acompanhar o funil."
            badge="CRM vazio"
            steps={[
              "Cadastre o primeiro contato para começar a organizar oportunidades.",
              "Depois edite o contato para definir valor estimado, observações e próximas ações.",
              "Quando o WhatsApp estiver ativo, novas conversas também podem alimentar seu pipeline.",
            ]}
            actions={[
              { label: "Cadastrar cliente", href: "/company/contacts/patients" },
              { label: "Abrir chat ao vivo", href: "/company/live-chat", variant: "outline" },
            ]}
          />
        ) : (
          <CRMKanban contacts={contacts} stages={stages} isLoading={isLoading} />
        )}
      </div>
    </CompanyLayout>
  );
};

export default CRM;

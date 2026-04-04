import { useState } from "react";
import CompanyLayout from "@/components/layout/CompanyLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfessionalsTable } from "@/components/company/ProfessionalsTable";
import { ProfessionalDialog } from "@/components/company/ProfessionalDialog";
import { SetupGuideCard } from "@/components/company/SetupGuideCard";
import { useProfessionals } from "@/hooks/useProfessionals";
import { UserPlus } from "lucide-react";

const Professionals = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<any>(null);
  const { professionals, toggleProfessional, refetch } = useProfessionals();

  const handleEdit = (professional: any) => {
    setSelectedProfessional(professional);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedProfessional(null);
    setDialogOpen(true);
  };

  const activeCount = professionals?.filter((p) => p.is_active).length || 0;
  const inactiveCount = professionals?.filter((p) => !p.is_active).length || 0;

  return (
    <CompanyLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Profissionais</h1>
            <p className="text-muted-foreground mt-2">
              Cadastre e gerencie os profissionais
            </p>
          </div>
          <Button onClick={handleAdd}>
            <UserPlus className="h-4 w-4 mr-2" />
            Adicionar Profissional
          </Button>
        </div>

        {(!professionals || professionals.length === 0) && (
          <SetupGuideCard
            title="Cadastre o primeiro profissional"
            description="Esse é o passo que libera a seleção de agenda e permite vincular serviços reais à equipe."
            badge="Passo 1 do onboarding"
            steps={[
              {
                title: "Adicione nome e especialidade",
                description: "Comece com quem realmente vai atender para a agenda ficar clara desde o início.",
              },
              {
                title: "Deixe o profissional ativo",
                description: "Somente profissionais ativos aparecem na agenda e podem receber serviços.",
              },
              {
                title: "Depois avance para serviços",
                description: "Com a equipe cadastrada, o próximo passo é dizer o que cada pessoa oferece.",
              },
            ]}
            actions={[
              { label: "Adicionar primeiro profissional", onClick: handleAdd },
              { label: "Ir para serviços", href: "/company/settings/services", variant: "outline" },
            ]}
          />
        )}

        <Card>
          <CardContent className="pt-6">
            {professionals ? (
              <ProfessionalsTable
                professionals={professionals}
                onEdit={handleEdit}
                onDelete={toggleProfessional.mutate}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-3 md:grid-cols-3 mt-6">
          <Card className="p-3">
            <CardHeader className="pb-2 px-0 pt-0">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="text-xl font-bold">{professionals?.length || 0}</div>
            </CardContent>
          </Card>

          <Card className="p-3">
            <CardHeader className="pb-2 px-0 pt-0">
              <CardTitle className="text-sm font-medium">Ativos</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="text-xl font-bold text-green-600">{activeCount}</div>
            </CardContent>
          </Card>

          <Card className="p-3">
            <CardHeader className="pb-2 px-0 pt-0">
              <CardTitle className="text-sm font-medium">Inativos</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="text-xl font-bold text-muted-foreground">{inactiveCount}</div>
            </CardContent>
          </Card>
        </div>

        <ProfessionalDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          professional={selectedProfessional}
          onSuccess={refetch}
        />
      </div>
    </CompanyLayout>
  );
};

export default Professionals;

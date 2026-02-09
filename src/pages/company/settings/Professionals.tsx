import { useState } from "react";
import CompanyLayout from "@/components/layout/CompanyLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfessionalsTable } from "@/components/company/ProfessionalsTable";
import { ProfessionalDialog } from "@/components/company/ProfessionalDialog";
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

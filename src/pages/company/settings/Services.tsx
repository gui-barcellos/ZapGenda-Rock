import { useState } from "react";
import CompanyLayout from "@/components/layout/CompanyLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ServicesTable } from "@/components/company/ServicesTable";
import { ServiceDialog } from "@/components/company/ServiceDialog";
import { useServices } from "@/hooks/useServices";
import { Plus } from "lucide-react";

const Services = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const { services, toggleService, refetch } = useServices();

  const handleEdit = (service: any) => {
    setSelectedService(service);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedService(null);
    setDialogOpen(true);
  };

  const avgPrice =
    services && services.length > 0
      ? services.reduce((sum, s) => sum + s.price, 0) / services.length
      : 0;

  const avgDuration =
    services && services.length > 0
      ? services.reduce((sum, s) => sum + s.duration, 0) / services.length
      : 0;

  return (
    <CompanyLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Serviços</h1>
            <p className="text-muted-foreground mt-2">Configure os serviços oferecidos</p>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Serviço
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            {services ? (
              <ServicesTable services={services} onEdit={handleEdit} onDelete={toggleService.mutate} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-3 md:grid-cols-3 mt-6">
          <Card className="p-3">
            <CardHeader className="pb-2 px-0 pt-0">
              <CardTitle className="text-sm font-medium">Total de Serviços</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="text-xl font-bold">{services?.length || 0}</div>
            </CardContent>
          </Card>

          <Card className="p-3">
            <CardHeader className="pb-2 px-0 pt-0">
              <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="text-xl font-bold text-green-600">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(avgPrice)}
              </div>
            </CardContent>
          </Card>

          <Card className="p-3">
            <CardHeader className="pb-2 px-0 pt-0">
              <CardTitle className="text-sm font-medium">Duração Média</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="text-xl font-bold">{Math.round(avgDuration)} min</div>
            </CardContent>
          </Card>
        </div>

        <ServiceDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          service={selectedService}
          onSuccess={refetch}
        />
      </div>
    </CompanyLayout>
  );
};

export default Services;

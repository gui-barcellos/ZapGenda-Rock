import CompanyLayout from "@/components/layout/CompanyLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AvailabilitySchedule } from "@/components/company/AvailabilitySchedule";
import { ServiceAvailabilitySchedule } from "@/components/company/ServiceAvailabilitySchedule";
import { ProfessionalBlockedSlots } from "@/components/company/ProfessionalBlockedSlots";
import { GeneralBlockedSlots } from "@/components/company/GeneralBlockedSlots";
import { SetupGuideCard } from "@/components/company/SetupGuideCard";
import { useProfessionals } from "@/hooks/useProfessionals";
import { useServices } from "@/hooks/useServices";
import { Calendar, CalendarOff, Briefcase, User } from "lucide-react";

const Availability = () => {
  const { professionals = [] } = useProfessionals();
  const { services = [] } = useServices();

  const activeProfessionals = professionals.filter((professional) => professional.is_active);
  const activeServices = services.filter((service) => service.is_active);

  return (
    <CompanyLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Disponibilidade</h1>
          <p className="text-muted-foreground mt-2">
            Configure horários de trabalho e bloqueios de agenda
          </p>
        </div>

        {activeProfessionals.length === 0 && (
          <SetupGuideCard
            title="Cadastre profissionais antes de configurar horários"
            description="A disponibilidade depende de alguém ativo na equipe. Sem isso, esta tela vira um beco sem saída."
            badge="Dependência pendente"
            actions={[
              { label: "Adicionar profissional", href: "/company/settings/professionals" },
            ]}
          />
        )}

        {activeProfessionals.length > 0 && activeServices.length === 0 && (
          <SetupGuideCard
            title="Você já tem equipe, mas ainda faltam serviços"
            description="Depois de ajustar os horários, o próximo passo é cadastrar serviços ativos para a agenda aceitar marcações reais."
            badge="Próximo passo"
            actions={[
              { label: "Cadastrar serviços", href: "/company/settings/services" },
              { label: "Abrir agenda", href: "/company/schedule", variant: "outline" },
            ]}
          />
        )}

        <Tabs defaultValue="professional" className="space-y-4">
          <TabsList>
            <TabsTrigger value="professional">
              <Calendar className="h-4 w-4 mr-2" />
              Horários dos Profissionais
            </TabsTrigger>
            <TabsTrigger value="service">
              <Briefcase className="h-4 w-4 mr-2" />
              Horários dos Serviços
            </TabsTrigger>
            <TabsTrigger value="professional-blocked">
              <User className="h-4 w-4 mr-2" />
              Bloqueio de Profissional
            </TabsTrigger>
            <TabsTrigger value="general-blocked">
              <CalendarOff className="h-4 w-4 mr-2" />
              Bloqueio Geral
            </TabsTrigger>
          </TabsList>

          <TabsContent value="professional">
            <AvailabilitySchedule />
          </TabsContent>

          <TabsContent value="service">
            <ServiceAvailabilitySchedule />
          </TabsContent>

          <TabsContent value="professional-blocked">
            <ProfessionalBlockedSlots />
          </TabsContent>

          <TabsContent value="general-blocked">
            <GeneralBlockedSlots />
          </TabsContent>
        </Tabs>
      </div>
    </CompanyLayout>
  );
};

export default Availability;

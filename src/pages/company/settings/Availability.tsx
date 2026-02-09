import CompanyLayout from "@/components/layout/CompanyLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AvailabilitySchedule } from "@/components/company/AvailabilitySchedule";
import { ServiceAvailabilitySchedule } from "@/components/company/ServiceAvailabilitySchedule";
import { ProfessionalBlockedSlots } from "@/components/company/ProfessionalBlockedSlots";
import { GeneralBlockedSlots } from "@/components/company/GeneralBlockedSlots";
import { ArrowLeft, Calendar, CalendarOff, Briefcase, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Availability = () => {
  const navigate = useNavigate();

  return (
    <CompanyLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Disponibilidade</h1>
          <p className="text-muted-foreground mt-2">
            Configure horários de trabalho e bloqueios de agenda
          </p>
        </div>

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

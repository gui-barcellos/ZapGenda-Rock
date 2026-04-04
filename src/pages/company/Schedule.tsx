import { useState, useMemo, useEffect } from "react";
import CompanyLayout from "@/components/layout/CompanyLayout";
import { useAppointments, useUpdateAppointment } from "@/hooks/useAppointments";
import { useProfessionals } from "@/hooks/useProfessionals";
import { useSchedulingTags } from "@/hooks/useSchedulingTags";
import { useCompanyData } from "@/hooks/useCompanyData";
import { useServices } from "@/hooks/useServices";
import { useAvailability } from "@/hooks/useAvailability";
import { WeekScheduleGrid } from "@/components/company/WeekScheduleGrid";
import { ScheduleSidebar } from "@/components/company/ScheduleSidebar";
import QuickAppointmentDialog from "@/components/company/QuickAppointmentDialog";
import AppointmentDetailsDialog from "@/components/company/AppointmentDetailsDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OnboardingChecklistCard } from "@/components/company/OnboardingChecklistCard";
import { SetupGuideCard } from "@/components/company/SetupGuideCard";
import { useConnectedWhatsApp } from "@/hooks/useConnectedWhatsApp";
import { format, addMinutes, startOfWeek, endOfWeek, addWeeks, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { AlertCircle, CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

export default function Schedule() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedProfessionalId, setSelectedProfessionalId] = useState("");
  const [quickAppointmentOpen, setQuickAppointmentOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [defaultSlot, setDefaultSlot] = useState<any>(null);
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);

  const { professionals = [] } = useProfessionals();
  const { data: appointments = [], isLoading: appointmentsLoading } = useAppointments();
  const { data: schedulingTags = [], isLoading: tagsLoading } = useSchedulingTags();
  const { services = [] } = useServices();
  const { companyData } = useCompanyData();
  const { data: connectedWhatsApp } = useConnectedWhatsApp(companyData?.id ?? null);
  const { availability: professionalAvailability = [] } = useAvailability(selectedProfessionalId);
  const updateAppointment = useUpdateAppointment();

  const isLoading = appointmentsLoading || tagsLoading;

  // Formatar período da semana
  const getWeekRangeText = (date: Date) => {
    const weekStart = startOfWeek(date, { locale: ptBR });
    const weekEnd = endOfWeek(date, { locale: ptBR });
    
    const startDay = format(weekStart, "dd", { locale: ptBR });
    const endDay = format(weekEnd, "dd", { locale: ptBR });
    const month = format(weekEnd, "MMMM", { locale: ptBR });
    const year = format(weekEnd, "yyyy", { locale: ptBR });
    
    return `${startDay} a ${endDay} de ${month.charAt(0).toUpperCase() + month.slice(1)} de ${year}`;
  };

  // Carregar profissional salvo do localStorage ou selecionar primeiro
  useEffect(() => {
    const savedProfessionalId = localStorage.getItem("selected-professional-id");

    if (savedProfessionalId && professionals.find(p => p.id === savedProfessionalId)) {
      setSelectedProfessionalId(savedProfessionalId);
    } else if (professionals.length > 0 && !selectedProfessionalId) {
      const sortedProfessionals = [...professionals]
        .filter(p => p.is_active)
        .sort((a, b) => a.name.localeCompare(b.name));

      if (sortedProfessionals.length > 0) {
        setSelectedProfessionalId(sortedProfessionals[0].id);
      }
    }
  }, [professionals, selectedProfessionalId]);

  const handleProfessionalChange = (professionalId: string) => {
    setSelectedProfessionalId(professionalId);
    localStorage.setItem("selected-professional-id", professionalId);
  };

  const handleSlotSelect = (date: Date, time: string) => {
    const defaultValues = {
      professional_id: selectedProfessionalId,
      date: format(date, "yyyy-MM-dd"),
      start_time: time,
    };
    setDefaultSlot(defaultValues);
    setQuickAppointmentOpen(true);
  };

  const handleAppointmentClick = (appointment: any) => {
    setSelectedAppointment(appointment);
    setDetailsDialogOpen(true);
  };

  const handleAppointmentUpdate = async (
    appointmentId: string,
    newDate: string,
    newTime: string
  ) => {
    const appointment = appointments.find(a => a.id === appointmentId);
    if (!appointment) return;

    const [hours, minutes] = newTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0);

    const endDate = addMinutes(startDate, appointment.service.duration);
    const end_time = format(endDate, "HH:mm");

    updateAppointment.mutate(
      {
        id: appointmentId,
        data: {
          date: newDate,
          start_time: newTime,
          end_time: end_time,
        },
      },
      {
        onSuccess: () => {
          toast.success("Agendamento realocado com sucesso");
        },
        onError: () => {
          toast.error("Erro ao realocar agendamento");
        },
      }
    );
  };

  const selectedProfessional = useMemo(() => {
    return professionals.find(p => p.id === selectedProfessionalId);
  }, [professionals, selectedProfessionalId]);

  // Converter business_hours do formato do useCompanyData para o formato esperado pelo grid
  const businessHoursForGrid = useMemo(() => {
    if (!companyData?.business_hours) return [];
    return companyData.business_hours.map((bh: any) => ({
      day_of_week: bh.day,
      start_time: bh.start,
      end_time: bh.end,
      is_active: bh.is_active,
    }));
  }, [companyData]);

  const professionalAvailabilityForGrid = useMemo(() => {
    if (!professionalAvailability || professionalAvailability.length === 0) return [];
    return professionalAvailability.map((av: any) => ({
      day_of_week: av.day_of_week,
      start_time: av.start_time,
      end_time: av.end_time,
      is_active: av.is_active,
    }));
  }, [professionalAvailability]);

  const activeProfessionalsCount = professionals.filter((professional) => professional.is_active).length;
  const activeServicesCount = services.filter((service) => service.is_active).length;
  const hasBusinessHours = Array.isArray(companyData?.business_hours)
    && companyData.business_hours.some((slot) => slot.is_active && slot.start && slot.end);
  const needsSetup = activeProfessionalsCount === 0 || activeServicesCount === 0 || !hasBusinessHours;
  const hasAppointments = appointments.length > 0;

  return (
    <CompanyLayout>
      <div className="flex">
        <ScheduleSidebar
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          selectedProfessionalId={selectedProfessionalId}
          onProfessionalChange={handleProfessionalChange}
          professionals={professionals}
          appointments={appointments}
          schedulingTags={schedulingTags}
          onCreateAppointment={() => {
            setDefaultSlot({ professional_id: selectedProfessionalId });
            setQuickAppointmentOpen(true);
          }}
          onAppointmentSelect={(apt) => {
            setSelectedAppointment(apt);
            setDetailsDialogOpen(true);
          }}
          createDisabled={needsSetup}
        />

        <div className="flex-1 bg-card">
          {/* Header da Agenda */}
          <div className="sticky top-0 z-10 bg-card border-b border-border shadow-md flex-shrink-0">
            <div className="p-6 max-w-[1600px] mx-auto">
              <div className="flex items-center justify-center gap-4">
                {/* Botões de navegação à esquerda */}
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setSelectedDate(subWeeks(selectedDate, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Hoje
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedDate(addWeeks(selectedDate, 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Nome e período no centro */}
                <div className="text-center">
                  <h2 className="text-2xl font-semibold">
                    {selectedProfessional?.name || "Selecione um profissional"}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {getWeekRangeText(selectedDate)}
                  </p>
                </div>

                {/* Espaço vazio à direita para manter centralização */}
                <div className="w-[140px]" />
              </div>
            </div>
          </div>

          {/* Grid com scroll único */}
          <div className="flex-1">
            <div className="p-4 max-w-[1600px] mx-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-center space-y-4 w-full">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-64 w-full" />
                </div>
              </div>
            ) : needsSetup ? (
              <div className="space-y-4">
                <Card className="border-dashed shadow-sm">
                  <div className="flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-lg font-semibold">
                        <AlertCircle className="h-5 w-5 text-amber-600" />
                        Termine a configuração inicial da agenda
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Antes de abrir a grade semanal, a clínica precisa ter pelo menos um profissional ativo,
                        um serviço ativo e horários configurados.
                      </p>
                    </div>
                  </div>
                </Card>

                <OnboardingChecklistCard
                  professionalsCount={activeProfessionalsCount}
                  activeServicesCount={activeServicesCount}
                  hasBusinessHours={hasBusinessHours}
                  hasWhatsAppConnected={Boolean(connectedWhatsApp?.isConnected)}
                />
              </div>
            ) : !hasAppointments ? (
              <div className="space-y-4">
                <SetupGuideCard
                  title="Sua agenda está pronta. Falta só o primeiro agendamento."
                  description="A configuração básica já foi concluída. Agora vale registrar o primeiro horário para a clínica sair do zero e validar o fluxo completo."
                  badge="Próximo passo"
                  steps={[
                    {
                      title: "Crie um agendamento manual de teste",
                      description: "Use o botão AGENDAR ou clique em um horário livre na grade semanal.",
                    },
                    {
                      title: "Confira serviço e profissional",
                      description: "Garanta que o serviço esteja vinculado a um profissional ativo.",
                    },
                    {
                      title: "Depois conecte o WhatsApp",
                      description: "Com a agenda validada, a operação fica pronta para automações e atendimento em tempo real.",
                    },
                  ]}
                  actions={[
                    {
                      label: "Criar primeiro agendamento",
                      onClick: () => {
                        setDefaultSlot({ professional_id: selectedProfessionalId });
                        setQuickAppointmentOpen(true);
                      },
                    },
                    { label: "Revisar serviços", href: "/company/settings/services", variant: "outline" },
                    { label: "Conectar WhatsApp", href: "/company/settings/whatsapp", variant: "outline" },
                  ]}
                />

                <Card className="shadow-lg">
                  <WeekScheduleGrid
                    selectedDate={selectedDate}
                    selectedProfessionalId={selectedProfessionalId}
                    appointments={appointments}
                    businessHours={businessHoursForGrid}
                    professionalAvailability={professionalAvailabilityForGrid}
                    schedulingTags={schedulingTags}
                    onAppointmentUpdate={handleAppointmentUpdate}
                    onSlotClick={handleSlotSelect}
                    onAppointmentClick={handleAppointmentClick}
                  />
                </Card>
              </div>
            ) : (
              <Card className="shadow-lg">
                <WeekScheduleGrid
                  selectedDate={selectedDate}
                  selectedProfessionalId={selectedProfessionalId}
                  appointments={appointments}
                  businessHours={businessHoursForGrid}
                  professionalAvailability={professionalAvailabilityForGrid}
                  schedulingTags={schedulingTags}
                  onAppointmentUpdate={handleAppointmentUpdate}
                  onSlotClick={handleSlotSelect}
                  onAppointmentClick={handleAppointmentClick}
                />
              </Card>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <QuickAppointmentDialog
        open={quickAppointmentOpen}
        onOpenChange={(open) => {
          setQuickAppointmentOpen(open);
          if (!open) {
            setEditingAppointmentId(null);
            setDefaultSlot(null);
          }
        }}
        defaultValues={defaultSlot}
        appointmentId={editingAppointmentId || undefined}
      />
      <AppointmentDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        appointment={selectedAppointment}
        onEdit={() => {
          setDetailsDialogOpen(false);
          setEditingAppointmentId(selectedAppointment.id);
          setDefaultSlot({
            professional_id: selectedAppointment.professional_id,
            service_id: selectedAppointment.service_id,
            contact_id: selectedAppointment.contact_id,
            date: selectedAppointment.date,
            start_time: selectedAppointment.start_time,
            end_time: selectedAppointment.end_time,
          });
          setQuickAppointmentOpen(true);
        }}
      />
    </CompanyLayout>
  );
}

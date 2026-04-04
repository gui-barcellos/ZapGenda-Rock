import { useMemo } from "react";
import CompanyLayout from "@/components/layout/CompanyLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, CheckCircle, TrendingUp, Clock, AlertCircle } from "lucide-react";
import { useAppointments } from "@/hooks/useAppointments";
import { useContacts } from "@/hooks/useContacts";
import { useServices } from "@/hooks/useServices";
import { useProfessionals } from "@/hooks/useProfessionals";
import { useCompanyData } from "@/hooks/useCompanyData";
import { useConnectedWhatsApp } from "@/hooks/useConnectedWhatsApp";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { OnboardingChecklistCard } from "@/components/company/OnboardingChecklistCard";
import { SetupGuideCard } from "@/components/company/SetupGuideCard";
import { format, addDays, isAfter, isBefore, isToday, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DashboardAppointment {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
  service_id?: string;
  service?: { name?: string | null } | null;
  contact?: { name?: string | null } | null;
}

interface DashboardService {
  id: string;
  name: string;
  duration: number;
  price: number;
  color: string;
  is_active: boolean;
}

export default function Dashboard() {
  const { data: appointments = [], isLoading: appointmentsLoading } = useAppointments();
  const { data: contactsData, isLoading: contactsLoading } = useContacts();
  const { services = [], isLoading: servicesLoading } = useServices();
  const { professionals = [], isLoading: professionalsLoading } = useProfessionals();
  const { companyData } = useCompanyData();
  const { data: connectedWhatsApp } = useConnectedWhatsApp(companyData?.id ?? null);

  const contacts = contactsData?.contacts || [];
  const typedAppointments = appointments as DashboardAppointment[];
  const typedServices = services as DashboardService[];

  const isLoading = appointmentsLoading || contactsLoading || servicesLoading || professionalsLoading;

  const todayAppointments = useMemo(() => {
    return typedAppointments.filter((appointment) => isToday(new Date(appointment.date)));
  }, [typedAppointments]);

  const upcomingAppointments = useMemo(() => {
    const today = startOfDay(new Date());
    const nextWeek = addDays(today, 7);

    return typedAppointments
      .filter((appointment) => {
        const appointmentDate = startOfDay(new Date(appointment.date));
        return isAfter(appointmentDate, today) && isBefore(appointmentDate, nextWeek);
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);
  }, [typedAppointments]);

  const topServices = useMemo(() => {
    const serviceCounts = typedAppointments.reduce<Record<string, number>>((accumulator, appointment) => {
      if (appointment.service_id) {
        accumulator[appointment.service_id] = (accumulator[appointment.service_id] || 0) + 1;
      }
      return accumulator;
    }, {});

    return typedServices
      .map((service) => ({
        ...service,
        count: serviceCounts[service.id] || 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [typedAppointments, typedServices]);

  const todayStats = useMemo(() => {
    return {
      total: todayAppointments.length,
      completed: todayAppointments.filter((appointment) => appointment.status === "completed").length,
      confirmed: todayAppointments.filter((appointment) => appointment.status === "confirmed").length,
      pending: todayAppointments.filter((appointment) => appointment.status === "scheduled").length,
    };
  }, [todayAppointments]);

  const activeProfessionalsCount = professionals.filter((professional) => professional.is_active).length;
  const activeServicesCount = typedServices.filter((service) => service.is_active).length;
  const hasBusinessHours =
    Array.isArray(companyData?.business_hours) &&
    companyData.business_hours.some((slot) => slot.is_active && slot.start && slot.end);
  const isReadyForAppointments = activeProfessionalsCount > 0 && activeServicesCount > 0 && hasBusinessHours;

  const statusColors: Record<DashboardAppointment["status"], string> = {
    scheduled: "bg-yellow-100 text-yellow-800 border-yellow-300",
    confirmed: "bg-green-100 text-green-800 border-green-300",
    completed: "bg-blue-100 text-blue-800 border-blue-300",
    cancelled: "bg-red-100 text-red-800 border-red-300",
    no_show: "bg-slate-200 text-slate-700 border-slate-300",
  };

  const statusLabels: Record<DashboardAppointment["status"], string> = {
    scheduled: "Agendado",
    confirmed: "Confirmado",
    completed: "Concluído",
    cancelled: "Cancelado",
    no_show: "Não compareceu",
  };

  return (
    <CompanyLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Visão geral dos agendamentos e atividades da sua empresa
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Agendamentos Hoje</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{todayStats.total}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {todayStats.completed} concluídos, {todayStats.pending} pendentes
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{contacts.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Agendamentos</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{typedAppointments.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Serviços Ativos</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{typedServices.filter((service) => service.is_active).length}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {!isLoading && (
          <>
            <OnboardingChecklistCard
              professionalsCount={activeProfessionalsCount}
              activeServicesCount={activeServicesCount}
              hasBusinessHours={hasBusinessHours}
              hasWhatsAppConnected={Boolean(connectedWhatsApp?.isConnected)}
            />

            {typedAppointments.length === 0 && (
              <SetupGuideCard
                title={isReadyForAppointments ? "Primeiro agendamento: faça a agenda ganhar vida" : "Sua operação ainda está em configuração inicial"}
                description={isReadyForAppointments
                  ? "Você já tem a base mínima pronta. O próximo ganho é registrar o primeiro agendamento e validar a experiência completa da clínica."
                  : "Antes de esperar conversas e agendamentos, feche a configuração mínima da clínica para evitar páginas vazias e dúvidas na operação."}
                badge={isReadyForAppointments ? "Sem agendamentos ainda" : "Onboarding pendente"}
                steps={isReadyForAppointments
                  ? [
                      {
                        title: "Abra a agenda semanal",
                        description: "Escolha um profissional e clique em um horário livre para criar o primeiro atendimento.",
                      },
                      {
                        title: "Cadastre ou confirme o cliente",
                        description: "Use um agendamento manual para validar serviço, duração e fluxo interno antes de abrir automações.",
                      },
                      {
                        title: "Depois conecte o WhatsApp",
                        description: "Assim a clínica passa do modo teste para operação assistida por mensagens.",
                      },
                    ]
                  : [
                      {
                        title: "Cadastre pelo menos um profissional",
                        description: "Sem equipe ativa, a agenda não consegue abrir horários úteis.",
                        done: activeProfessionalsCount > 0,
                      },
                      {
                        title: "Cadastre pelo menos um serviço ativo",
                        description: "Serviços definem duração e o que pode ser agendado.",
                        done: activeServicesCount > 0,
                      },
                      {
                        title: "Configure os horários de atendimento",
                        description: "A agenda só fica operacional quando a disponibilidade da clínica estiver salva.",
                        done: hasBusinessHours,
                      },
                    ]}
                actions={isReadyForAppointments
                  ? [
                      { label: "Ir para agenda", href: "/company/schedule" },
                      { label: "Conectar WhatsApp", href: "/company/settings/whatsapp", variant: "outline" },
                    ]
                  : [
                      { label: "Abrir checklist na agenda", href: "/company/schedule" },
                      { label: "Configurar profissionais", href: "/company/settings/professionals", variant: "outline" },
                    ]}
              />
            )}
          </>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Agendamentos de Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : todayAppointments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum agendamento para hoje</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{appointment.contact?.name || "Cliente sem nome"}</div>
                        <div className="text-sm text-muted-foreground">
                          {appointment.service?.name || "Serviço"} • {appointment.start_time} - {appointment.end_time}
                        </div>
                      </div>
                      <Badge variant="outline" className={statusColors[appointment.status]}>
                        {statusLabels[appointment.status]}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Próximos Agendamentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : upcomingAppointments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum agendamento próximo</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{appointment.contact?.name || "Cliente sem nome"}</div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(appointment.date), "dd 'de' MMMM", { locale: ptBR })} • {appointment.start_time}
                        </div>
                      </div>
                      <Badge variant="outline" className={statusColors[appointment.status]}>
                        {statusLabels[appointment.status]}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Serviços Mais Agendados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : topServices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum serviço agendado ainda</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topServices.map((service) => (
                  <div key={service.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-12 rounded-full" style={{ backgroundColor: service.color }} />
                      <div>
                        <div className="font-medium">{service.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {service.duration} min • R$ {Number(service.price).toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{service.count}</div>
                      <div className="text-xs text-muted-foreground">agendamentos</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </CompanyLayout>
  );
}

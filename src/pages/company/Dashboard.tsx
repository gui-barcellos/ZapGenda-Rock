import { useMemo } from "react";
import CompanyLayout from "@/components/layout/CompanyLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, CheckCircle, TrendingUp, Clock, AlertCircle } from "lucide-react";
import { useAppointments } from "@/hooks/useAppointments";
import { useContacts } from "@/hooks/useContacts";
import { useServices } from "@/hooks/useServices";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { isToday, isFuture, parseISO, format, addDays, isAfter, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Dashboard() {
  const { data: appointments = [], isLoading: appointmentsLoading } = useAppointments();
  const { data: contactsData, isLoading: contactsLoading } = useContacts();
  const { services = [], isLoading: servicesLoading } = useServices();
  
  const contacts = contactsData?.contacts || [];

  const isLoading = appointmentsLoading || contactsLoading || servicesLoading;

  // Agendamentos de hoje
  const todayAppointments = useMemo(() => {
    return appointments.filter((apt: any) => isToday(new Date(apt.date)));
  }, [appointments]);

  // Próximos agendamentos (próximos 7 dias)
  const upcomingAppointments = useMemo(() => {
    const today = startOfDay(new Date());
    const nextWeek = addDays(today, 7);
    return appointments
      .filter((apt: any) => {
        const aptDate = startOfDay(new Date(apt.date));
        return isAfter(aptDate, today) && isBefore(aptDate, nextWeek);
      })
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);
  }, [appointments]);

  // Serviços mais agendados
  const topServices = useMemo(() => {
    const serviceCounts = appointments.reduce((acc: any, apt: any) => {
      if (apt.service_id) {
        acc[apt.service_id] = (acc[apt.service_id] || 0) + 1;
      }
      return acc;
    }, {});

    return services
      .map((service: any) => ({
        ...service,
        count: serviceCounts[service.id] || 0,
      }))
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 5);
  }, [appointments, services]);

  // Status dos agendamentos de hoje
  const todayStats = useMemo(() => {
    return {
      total: todayAppointments.length,
      completed: todayAppointments.filter((apt: any) => apt.status === "completed").length,
      confirmed: todayAppointments.filter((apt: any) => apt.status === "confirmed").length,
      pending: todayAppointments.filter((apt: any) => apt.status === "scheduled").length,
    };
  }, [todayAppointments]);

  const statusColors: Record<string, string> = {
    scheduled: "bg-yellow-100 text-yellow-800 border-yellow-300",
    confirmed: "bg-green-100 text-green-800 border-green-300",
    completed: "bg-blue-100 text-blue-800 border-blue-300",
    cancelled: "bg-red-100 text-red-800 border-red-300",
  };

  const statusLabels: Record<string, string> = {
    scheduled: "Agendado",
    confirmed: "Confirmado",
    completed: "Concluído",
    cancelled: "Cancelado",
  };

  return (
    <CompanyLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Visão geral dos agendamentos e atividades da sua empresa
          </p>
        </div>

        {/* Stats Cards */}
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
                <div className="text-2xl font-bold">{appointments.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Serviços Ativos</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {services.filter((s: any) => s.is_active).length}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Agendamentos de Hoje */}
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
                  {todayAppointments.map((apt: any) => (
                    <div
                      key={apt.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{apt.contact?.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {apt.service?.name} • {apt.start_time} - {apt.end_time}
                        </div>
                      </div>
                      <Badge variant="outline" className={statusColors[apt.status]}>
                        {statusLabels[apt.status]}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Próximos Agendamentos */}
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
                  {upcomingAppointments.map((apt: any) => (
                    <div
                      key={apt.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{apt.contact?.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(apt.date), "dd 'de' MMMM", { locale: ptBR })} • {apt.start_time}
                        </div>
                      </div>
                      <Badge variant="outline" className={statusColors[apt.status]}>
                        {statusLabels[apt.status]}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Serviços Mais Agendados */}
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
                {topServices.map((service: any, index: number) => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-2 h-12 rounded-full"
                        style={{ backgroundColor: service.color }}
                      />
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

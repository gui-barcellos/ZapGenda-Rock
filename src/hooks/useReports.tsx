import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subDays, subMonths, startOfYear, endOfYear } from "date-fns";
import { PeriodOption } from "@/components/dashboard/PeriodFilter";

export const getPeriodDates = (period: PeriodOption) => {
  const now = new Date();
  let startDate: Date;
  let endDate: Date = endOfDay(now);

  switch (period) {
    case '7days':
      startDate = startOfDay(subDays(now, 6));
      break;
    case '30days':
      startDate = startOfDay(subDays(now, 29));
      break;
    case 'currentMonth':
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
      break;
    case 'lastMonth':
      const lastMonth = subMonths(now, 1);
      startDate = startOfMonth(lastMonth);
      endDate = endOfMonth(lastMonth);
      break;
    case '3months':
      startDate = startOfDay(subMonths(now, 3));
      break;
    case '6months':
      startDate = startOfDay(subMonths(now, 6));
      break;
    case 'currentYear':
      startDate = startOfYear(now);
      endDate = endOfYear(now);
      break;
    default:
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
  }

  return { startDate, endDate };
};

export const useReports = (period: PeriodOption = 'currentMonth') => {
  const { startDate, endDate } = getPeriodDates(period);

  return useQuery({
    queryKey: ["reports", period, startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) throw new Error("No company found");

      // Buscar agendamentos do período
      const { data: appointments, error: appointmentsError } = await supabase
        .from("appointments")
        .select(`
          *,
          services (name, price),
          professionals (name),
          contacts (name)
        `)
        .eq("company_id", profile.company_id)
        .gte("date", startDate.toISOString().split('T')[0])
        .lte("date", endDate.toISOString().split('T')[0]);

      if (appointmentsError) throw appointmentsError;

      // Buscar contatos criados no período
      const { data: newContacts, error: contactsError } = await supabase
        .from("contacts")
        .select("id, created_at")
        .eq("company_id", profile.company_id)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (contactsError) throw contactsError;

      // Calcular métricas
      const totalAppointments = appointments?.length || 0;
      const confirmedAppointments = appointments?.filter(a => a.status === 'confirmed').length || 0;
      const completedAppointments = appointments?.filter(a => a.status === 'completed').length || 0;
      const cancelledAppointments = appointments?.filter(a => a.status === 'cancelled').length || 0;

      const totalRevenue = appointments
        ?.filter(a => a.status === 'completed')
        .reduce((sum, a) => sum + (Number(a.services?.price) || 0), 0) || 0;

      const newPatientsCount = newContacts?.length || 0;

      // Agrupar por data
      const appointmentsByDate = appointments?.reduce((acc: any, apt) => {
        const date = apt.date;
        if (!acc[date]) {
          acc[date] = { date, count: 0, revenue: 0 };
        }
        acc[date].count++;
        if (apt.status === 'completed') {
          acc[date].revenue += Number(apt.services?.price) || 0;
        }
        return acc;
      }, {});

      // Agrupar por serviço
      const revenueByService = appointments
        ?.filter(a => a.status === 'completed')
        .reduce((acc: any, apt) => {
          const serviceName = apt.services?.name || 'Sem serviço';
          if (!acc[serviceName]) {
            acc[serviceName] = { service: serviceName, revenue: 0, count: 0 };
          }
          acc[serviceName].revenue += Number(apt.services?.price) || 0;
          acc[serviceName].count++;
          return acc;
        }, {});

      // Agrupar por profissional
      const appointmentsByProfessional = appointments?.reduce((acc: any, apt) => {
        const profName = apt.professionals?.name || 'Sem profissional';
        if (!acc[profName]) {
          acc[profName] = {
            professional: profName,
            total: 0,
            completed: 0,
            cancelled: 0,
            revenue: 0
          };
        }
        acc[profName].total++;
        if (apt.status === 'completed') {
          acc[profName].completed++;
          acc[profName].revenue += Number(apt.services?.price) || 0;
        }
        if (apt.status === 'cancelled') {
          acc[profName].cancelled++;
        }
        return acc;
      }, {});

      return {
        metrics: {
          totalAppointments,
          confirmedAppointments,
          completedAppointments,
          cancelledAppointments,
          totalRevenue,
          newPatientsCount,
          attendanceRate: totalAppointments > 0 
            ? ((completedAppointments / totalAppointments) * 100).toFixed(1)
            : '0'
        },
        appointmentsByDate: Object.values(appointmentsByDate || {}),
        revenueByService: Object.values(revenueByService || {}),
        appointmentsByProfessional: Object.values(appointmentsByProfessional || {})
      };
    },
    refetchInterval: 60000
  });
};

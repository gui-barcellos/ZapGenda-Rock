import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { timeToMinutes, getLocalWeekdayFromISO } from "@/lib/time-utils";

interface ServiceAvailability {
  id: string;
  service_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface ScheduleUpdate {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export function useServiceAvailability(serviceId?: string) {
  const queryClient = useQueryClient();

  const { data: serviceAvailability, isLoading } = useQuery({
    queryKey: ["service-availability", serviceId],
    queryFn: async () => {
      if (!serviceId) return [];
      const { data, error } = await supabase
        .from("service_availability")
        .select("*")
        .eq("service_id", serviceId)
        .order("day_of_week");
      if (error) throw error;
      return data as ServiceAvailability[];
    },
    enabled: !!serviceId,
  });

  const bulkUpdateServiceAvailability = useMutation({
    mutationFn: async ({
      serviceId,
      schedules,
    }: {
      serviceId: string;
      schedules: ScheduleUpdate[];
    }) => {
      // Deletar horários existentes
      await supabase
        .from("service_availability")
        .delete()
        .eq("service_id", serviceId);

      // Filtrar apenas os ativos
      const activeSchedules = schedules.filter(s => s.is_active);
      
      if (activeSchedules.length > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("id", user?.id)
          .single();

        if (!profile?.company_id) throw new Error("Empresa não encontrada");

        const { error } = await supabase
          .from("service_availability")
          .insert(
            activeSchedules.map(s => ({
              service_id: serviceId,
              company_id: profile.company_id,
              day_of_week: s.day_of_week,
              start_time: s.start_time,
              end_time: s.end_time,
              is_active: true,
            }))
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-availability"] });
      toast.success("Horários do serviço atualizados");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["service-availability", serviceId] });
  };

  return {
    serviceAvailability,
    isLoading,
    bulkUpdateServiceAvailability,
    refetch,
  };
}

export function useServiceAvailabilityMap(
  services: any[],
  date?: string,
  startTime?: string,
  endTime?: string,
  professionalId?: string
) {
  return useQuery({
    queryKey: ["service-availability-map", date, startTime, endTime, professionalId],
    queryFn: async () => {
      const availabilityMap = new Map<string, boolean>();
      
      if (!date || !startTime || !endTime) {
        // Sem data/hora, retorna Map vazio (nenhum serviço disponível até validar)
        return availabilityMap;
      }

      const dayOfWeek = getLocalWeekdayFromISO(date);
      
      // Buscar availability de todos os serviços de uma vez
      const { data: allAvailability } = await supabase
        .from("service_availability")
        .select("service_id, start_time, end_time")
        .eq("day_of_week", dayOfWeek)
        .eq("is_active", true);

      // Se tem profissional selecionado, filtrar por service_professionals
      let profServiceIds: Set<string> | null = null;
      if (professionalId) {
        const { data: serviceProfessionals } = await supabase
          .from("service_professionals")
          .select("service_id")
          .eq("professional_id", professionalId);

        profServiceIds = new Set(
          serviceProfessionals?.map(sp => sp.service_id) || []
        );
      }

      // Mapear disponibilidade de cada serviço
      for (const service of services) {
        // Se tem profissional selecionado e serviço não é oferecido por ele
        if (profServiceIds && !profServiceIds.has(service.id)) {
          availabilityMap.set(service.id, false);
          continue;
        }

        // Verificar se service_availability permite o horário
        const serviceAvailabilities = allAvailability?.filter(
          av => av.service_id === service.id
        ) || [];

        if (serviceAvailabilities.length === 0) {
          availabilityMap.set(service.id, false);
          continue;
        }

        // Verificar se o intervalo do agendamento está contido no intervalo de disponibilidade
        const isAvailable = serviceAvailabilities.some(av => {
          const appointmentStart = timeToMinutes(startTime);
          const appointmentEnd = timeToMinutes(endTime);
          const availStart = timeToMinutes(av.start_time);
          const availEnd = timeToMinutes(av.end_time);
          
          // O agendamento deve começar e terminar dentro do horário disponível
          return appointmentStart >= availStart && appointmentEnd <= availEnd;
        });

        availabilityMap.set(service.id, isAvailable);
      }

      return availabilityMap;
    },
    enabled: services.length > 0 && !!date && !!startTime && !!endTime,
  });
}

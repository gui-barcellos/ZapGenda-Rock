import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format, parseISO, addMinutes } from "date-fns";
import { validateAppointmentDate } from "@/lib/scheduling-validation";
import { timeToMinutes, getLocalWeekdayFromISO } from "@/lib/time-utils";

export interface Appointment {
  id: string;
  company_id: string;
  professional_id: string;
  service_id: string;
  contact_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
  notes?: string;
  confirmation_sent: boolean;
  confirmation_sent_at?: string;
  created_at: string;
  updated_at: string;
}

const logAudit = async (
  action: string,
  companyId: string,
  entityId: string,
  payloadAfter?: any,
  reason?: string
) => {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const actorId = auth?.user?.id || null;
    await supabase.from("audit_logs").insert({
      company_id: companyId,
      actor_user_id: actorId,
      actor_type: "user",
      action,
      entity_type: "appointment",
      entity_id: entityId,
      payload_after: payloadAfter ?? null,
      reason: reason ?? null,
    });
  } catch {
    // Audit log is non-blocking
  }
};

export const useAppointments = (startDate?: string, endDate?: string, professionalId?: string) => {
  return useQuery({
    queryKey: ["appointments", startDate, endDate, professionalId],
    queryFn: async () => {
      let query = supabase
        .from("appointments")
        .select(`
          *,
          professional:professionals(name, color),
          service:services(name, color, duration, price),
          contact:contacts(name, phone, email)
        `)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true });

      if (startDate) {
        query = query.gte("date", startDate);
      }
      if (endDate) {
        query = query.lte("date", endDate);
      }
      if (professionalId) {
        query = query.eq("professional_id", professionalId);
      }

      const { data, error } = await query.limit(1000);

      if (error) throw error;
      return data;
    },
  });
};

export const useCreateAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<Appointment, "id" | "company_id" | "created_at" | "updated_at" | "confirmation_sent" | "confirmation_sent_at">) => {
      // 0. Buscar e validar regras de agendamento
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user?.id)
        .single();

      if (!profile?.company_id) {
        throw new Error("Empresa não encontrada");
      }

      const { data: schedulingRules } = await supabase
        .from("company_settings")
        .select("min_advance_hours_manual, max_advance_days_manual, scheduling_mode, open_next_month_on_day, months_ahead_visible, opening_type, opening_start_day, opening_end_day, opening_week")
        .eq("company_id", profile.company_id)
        .single();

      if (schedulingRules) {
        const appointmentDateTime = new Date(`${data.date}T${data.start_time}`);
        const validation = validateAppointmentDate(
          appointmentDateTime,
          {
            ...schedulingRules,
            scheduling_mode: (schedulingRules.scheduling_mode || 'rolling') as 'rolling' | 'monthly',
            min_advance_hours: schedulingRules.min_advance_hours_manual,
            max_advance_days: schedulingRules.max_advance_days_manual,
            min_advance_hours_ai: 0,
            max_advance_days_ai: 0,
            min_advance_hours_manual: schedulingRules.min_advance_hours_manual,
            max_advance_days_manual: schedulingRules.max_advance_days_manual,
            opening_type: (schedulingRules.opening_type || 'date_range') as 'date_range' | 'week_defined',
            opening_start_day: schedulingRules.opening_start_day || 1,
            opening_end_day: schedulingRules.opening_end_day || 5,
            opening_week: (schedulingRules.opening_week as 'first' | 'second' | 'third' | 'fourth' | 'last' | null) || null,
            auto_mark_no_show_enabled: false,
            auto_mark_no_show_hours: 0,
          },
          false // isAI = false (agendamento manual)
        );

        if (!validation.valid) {
          throw new Error(validation.error);
        }
      }

      // 1. Validar que o serviço está ativo
      const { data: service } = await supabase
        .from("services")
        .select("is_active")
        .eq("id", data.service_id)
        .single();

      if (!service?.is_active) {
        throw new Error("Este serviço não está disponível");
      }

      // 2. Validar que o profissional está ativo
      const { data: professional } = await supabase
        .from("professionals")
        .select("is_active")
        .eq("id", data.professional_id)
        .single();

      if (!professional?.is_active) {
        throw new Error("Este profissional não está disponível");
      }

      // 3. Validar vínculo profissional-serviço
      const { data: link } = await supabase
        .from("service_professionals")
        .select("*")
        .eq("service_id", data.service_id)
        .eq("professional_id", data.professional_id)
        .single();

      if (!link) {
        throw new Error("Este profissional não está vinculado a este serviço");
      }

      // 4. Validar disponibilidade DO PROFISSIONAL
      const dayOfWeek = getLocalWeekdayFromISO(data.date);
      const { data: profAvailability } = await supabase
        .from("availability")
        .select("*")
        .eq("professional_id", data.professional_id)
        .eq("day_of_week", dayOfWeek)
        .eq("is_active", true);

      const apStart = timeToMinutes(data.start_time);
      const apEnd = timeToMinutes(data.end_time);
      
      const isProfessionalAvailable = profAvailability?.some(av => {
        const st = timeToMinutes(av.start_time);
        const en = timeToMinutes(av.end_time);
        return apStart >= st && apEnd <= en;
      });

      if (!isProfessionalAvailable) {
        throw new Error("Profissional não está disponível neste horário");
      }

      // 5. Validar disponibilidade DO SERVIÇO
      const { data: serviceAvailability } = await supabase
        .from("service_availability")
        .select("*")
        .eq("service_id", data.service_id)
        .eq("day_of_week", dayOfWeek)
        .eq("is_active", true);

      const isServiceAvailable = serviceAvailability?.some(av => {
        const st = timeToMinutes(av.start_time);
        const en = timeToMinutes(av.end_time);
        return apStart >= st && apEnd <= en;
      });

      if (!isServiceAvailable) {
        throw new Error("Serviço não está disponível neste dia/horário");
      }

      // 6. Verificar bloqueios GERAIS primeiro
      const { data: generalBlock } = await supabase
        .from("blocked_slots")
        .select("*")
        .eq("company_id", profile?.company_id)
        .is("professional_id", null)
        .eq("date", data.date);

      if (generalBlock && generalBlock.length > 0) {
        const reason = generalBlock[0].reason ? ` (${generalBlock[0].reason})` : "";
        throw new Error(`Esta data está bloqueada para agendamentos${reason}`);
      }

      // 7. Verificar bloqueios do profissional
      const { data: blocks, error: blockError } = await supabase
        .from("blocked_slots")
        .select("*")
        .eq("professional_id", data.professional_id)
        .eq("date", data.date)
        .or(`and(start_time.lte.${data.start_time},end_time.gt.${data.start_time}),and(start_time.lt.${data.end_time},end_time.gte.${data.end_time})`);

      if (blockError) throw blockError;
      if (blocks && blocks.length > 0) {
        throw new Error("Este horário está bloqueado para o profissional");
      }

      // 8. Validar conflitos de horário
      const { data: conflicts, error: conflictError } = await supabase
        .from("appointments")
        .select("*")
        .eq("professional_id", data.professional_id)
        .eq("date", data.date)
        .neq("status", "cancelled")
        .or(`and(start_time.lte.${data.start_time},end_time.gt.${data.start_time}),and(start_time.lt.${data.end_time},end_time.gte.${data.end_time})`);

      if (conflictError) throw conflictError;
      if (conflicts && conflicts.length > 0) {
        throw new Error("Já existe um agendamento neste horário para este profissional");
      }

      const { data: result, error } = await supabase
        .from("appointments")
        .insert([{
          ...data,
          company_id: profile.company_id
        }])
        .select(`
          *,
          professional:professionals(name),
          service:services(name),
          contact:contacts(name, phone)
        `)
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast({
        title: "Agendamento criado",
        description: "O agendamento foi criado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar agendamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Appointment> }) => {
      const { data: before } = await supabase
        .from("appointments")
        .select("id, status, company_id")
        .eq("id", id)
        .single();

      const { data: result, error } = await supabase
        .from("appointments")
        .update(data)
        .eq("id", id)
        .select(`
          *,
          professional:professionals(name),
          service:services(name),
          contact:contacts(name, phone)
        `)
        .single();

      if (error) throw error;
      if (result?.company_id) {
        await logAudit("appointment_updated", result.company_id, result.id, result);
        if (before?.status && result.status && before.status !== result.status) {
          await logAudit(
            "appointment_status_changed",
            result.company_id,
            result.id,
            { from: before.status, to: result.status }
          );
        }
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast({
        title: "Agendamento atualizado",
        description: "O agendamento foi atualizado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar agendamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useCancelAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const updateData: Partial<Appointment> = {
        status: "cancelled",
      };
      
      if (reason) {
        updateData.notes = reason;
      }

      const { data: result, error } = await supabase
        .from("appointments")
        .update(updateData)
        .eq("id", id)
        .select(`
          *,
          professional:professionals(name),
          service:services(name),
          contact:contacts(name, phone)
        `)
        .single();

      if (error) throw error;
      if (result?.company_id) {
        await logAudit("appointment_cancelled", result.company_id, result.id, result, reason);
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast({
        title: "Agendamento cancelado",
        description: "O agendamento foi cancelado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao cancelar agendamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useConfirmAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: result, error } = await supabase
        .from("appointments")
        .update({ 
          status: "confirmed",
          confirmation_sent: true,
          confirmation_sent_at: new Date().toISOString()
        })
        .eq("id", id)
        .select(`
          *,
          professional:professionals(name),
          service:services(name),
          contact:contacts(name, phone)
        `)
        .single();

      if (error) throw error;
      if (result?.company_id) {
        await logAudit("appointment_confirmed", result.company_id, result.id, result);
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast({
        title: "Agendamento confirmado",
        description: "O agendamento foi confirmado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao confirmar agendamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useCompleteAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: result, error } = await supabase
        .from("appointments")
        .update({ status: "completed" })
        .eq("id", id)
        .select(`
          *,
          professional:professionals(name),
          service:services(name),
          contact:contacts(name, phone)
        `)
        .single();

      if (error) throw error;
      if (result?.company_id) {
        await logAudit("appointment_completed", result.company_id, result.id, result);
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast({
        title: "Agendamento concluído",
        description: "O agendamento foi marcado como realizado.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao concluir agendamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useDeleteAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: before } = await supabase
        .from("appointments")
        .select("id, company_id")
        .eq("id", id)
        .single();

      const { error } = await supabase
        .from("appointments")
        .delete()
        .eq("id", id);

      if (error) throw error;
      if (before?.company_id) {
        await logAudit("appointment_deleted", before.company_id, id);
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast({
        title: "Agendamento excluído",
        description: "O agendamento foi removido permanentemente.",
        duration: 1500,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir agendamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useMarkNoShow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: result, error } = await supabase
        .from("appointments")
        .update({ status: "no_show" })
        .eq("id", id)
        .select(`
          *,
          professional:professionals(name),
          service:services(name),
          contact:contacts(name, phone)
        `)
        .single();

      if (error) throw error;
      if (result?.company_id) {
        await logAudit("appointment_no_show", result.company_id, result.id, result);
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast({
        title: "Marcado como Não Compareceu",
        description: "O agendamento foi marcado como não comparecimento.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar agendamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};


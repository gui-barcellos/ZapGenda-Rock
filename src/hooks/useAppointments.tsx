import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format, addMinutes } from "date-fns";
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

interface AppointmentAuditPayload {
  [key: string]: unknown;
}

interface SchedulingRulesRow {
  min_advance_hours_manual: number | null;
  max_advance_days_manual: number | null;
  scheduling_mode: "rolling" | "monthly" | null;
  open_next_month_on_day: number | null;
  months_ahead_visible: number | null;
  opening_type: "date_range" | "week_defined" | null;
  opening_start_day: number | null;
  opening_end_day: number | null;
  opening_week: "first" | "second" | "third" | "fourth" | "last" | null;
}

interface AvailabilitySlot {
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface BlockedSlot {
  reason: string | null;
}

interface AppointmentMutationInput {
  professional_id: string;
  service_id: string;
  contact_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status?: Appointment["status"];
  notes?: string;
}

const overlapsRangeFilter = (startTime: string, endTime: string) =>
  `and(start_time.lte.${startTime},end_time.gt.${startTime}),and(start_time.lt.${endTime},end_time.gte.${endTime})`;

const logAudit = async (
  action: string,
  companyId: string,
  entityId: string,
  payloadAfter?: AppointmentAuditPayload,
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

const getCurrentCompanyId = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user?.id)
    .single();

  if (!profile?.company_id) {
    throw new Error("Empresa não encontrada");
  }

  return profile.company_id;
};

const validateSchedulingRules = async (companyId: string, input: AppointmentMutationInput) => {
  const { data: schedulingRules } = await supabase
    .from("company_settings")
    .select(
      "min_advance_hours_manual, max_advance_days_manual, scheduling_mode, open_next_month_on_day, months_ahead_visible, opening_type, opening_start_day, opening_end_day, opening_week"
    )
    .eq("company_id", companyId)
    .single<SchedulingRulesRow>();

  if (!schedulingRules) return;

  const appointmentDateTime = new Date(`${input.date}T${input.start_time}`);
  const validation = validateAppointmentDate(
    appointmentDateTime,
    {
      ...schedulingRules,
      scheduling_mode: schedulingRules.scheduling_mode || "rolling",
      min_advance_hours: schedulingRules.min_advance_hours_manual ?? 0,
      max_advance_days: schedulingRules.max_advance_days_manual ?? 0,
      min_advance_hours_ai: 0,
      max_advance_days_ai: 0,
      min_advance_hours_manual: schedulingRules.min_advance_hours_manual ?? 0,
      max_advance_days_manual: schedulingRules.max_advance_days_manual ?? 0,
      open_next_month_on_day: schedulingRules.open_next_month_on_day ?? 1,
      months_ahead_visible: schedulingRules.months_ahead_visible ?? 1,
      opening_type: schedulingRules.opening_type || "date_range",
      opening_start_day: schedulingRules.opening_start_day ?? 1,
      opening_end_day: schedulingRules.opening_end_day ?? 5,
      opening_week: schedulingRules.opening_week,
      auto_mark_no_show_enabled: false,
      auto_mark_no_show_hours: 0,
    },
    false
  );

  if (!validation.valid) {
    throw new Error(validation.error);
  }
};

const validateEntityAvailability = async (companyId: string, input: AppointmentMutationInput, appointmentId?: string) => {
  const { data: service } = await supabase
    .from("services")
    .select("id, is_active")
    .eq("id", input.service_id)
    .single<{ id: string; is_active: boolean }>();

  if (!service?.is_active) {
    throw new Error("Este serviço não está disponível");
  }

  const { data: professional } = await supabase
    .from("professionals")
    .select("id, is_active")
    .eq("id", input.professional_id)
    .single<{ id: string; is_active: boolean }>();

  if (!professional?.is_active) {
    throw new Error("Este profissional não está disponível");
  }

  const { data: link } = await supabase
    .from("service_professionals")
    .select("service_id, professional_id")
    .eq("company_id", companyId)
    .eq("service_id", input.service_id)
    .eq("professional_id", input.professional_id)
    .maybeSingle<{ service_id: string; professional_id: string }>();

  if (!link) {
    throw new Error("Este profissional não está vinculado a este serviço");
  }

  const dayOfWeek = getLocalWeekdayFromISO(input.date);
  const appointmentStart = timeToMinutes(input.start_time);
  const appointmentEnd = timeToMinutes(input.end_time);

  const { data: professionalAvailability } = await supabase
    .from("availability")
    .select("start_time, end_time, is_active")
    .eq("professional_id", input.professional_id)
    .eq("day_of_week", dayOfWeek)
    .eq("is_active", true)
    .returns<AvailabilitySlot[]>();

  const isProfessionalAvailable = professionalAvailability?.some((slot) => {
    const start = timeToMinutes(slot.start_time);
    const end = timeToMinutes(slot.end_time);
    return appointmentStart >= start && appointmentEnd <= end;
  });

  if (!isProfessionalAvailable) {
    throw new Error("Profissional não está disponível neste horário");
  }

  const { data: serviceAvailability } = await supabase
    .from("service_availability")
    .select("start_time, end_time, is_active")
    .eq("service_id", input.service_id)
    .eq("day_of_week", dayOfWeek)
    .eq("is_active", true)
    .returns<AvailabilitySlot[]>();

  const isServiceAvailable = serviceAvailability?.some((slot) => {
    const start = timeToMinutes(slot.start_time);
    const end = timeToMinutes(slot.end_time);
    return appointmentStart >= start && appointmentEnd <= end;
  });

  if (!isServiceAvailable) {
    throw new Error("Serviço não está disponível neste dia/horário");
  }

  const { data: generalBlocks } = await supabase
    .from("blocked_slots")
    .select("reason")
    .eq("company_id", companyId)
    .is("professional_id", null)
    .eq("date", input.date)
    .returns<BlockedSlot[]>();

  if (generalBlocks && generalBlocks.length > 0) {
    const reason = generalBlocks[0].reason ? ` (${generalBlocks[0].reason})` : "";
    throw new Error(`Esta data está bloqueada para agendamentos${reason}`);
  }

  const { data: professionalBlocks, error: professionalBlockError } = await supabase
    .from("blocked_slots")
    .select("reason")
    .eq("professional_id", input.professional_id)
    .eq("date", input.date)
    .or(overlapsRangeFilter(input.start_time, input.end_time))
    .returns<BlockedSlot[]>();

  if (professionalBlockError) throw professionalBlockError;
  if (professionalBlocks && professionalBlocks.length > 0) {
    throw new Error("Este horário está bloqueado para o profissional");
  }

  let conflictsQuery = supabase
    .from("appointments")
    .select("id")
    .eq("professional_id", input.professional_id)
    .eq("date", input.date)
    .neq("status", "cancelled")
    .or(overlapsRangeFilter(input.start_time, input.end_time));

  if (appointmentId) {
    conflictsQuery = conflictsQuery.neq("id", appointmentId);
  }

  const { data: conflicts, error: conflictError } = await conflictsQuery;

  if (conflictError) throw conflictError;
  if (conflicts && conflicts.length > 0) {
    throw new Error("Já existe um agendamento neste horário para este profissional");
  }
};

const validateAppointmentInput = async (
  companyId: string,
  input: AppointmentMutationInput,
  appointmentId?: string
) => {
  await validateSchedulingRules(companyId, input);
  await validateEntityAvailability(companyId, input, appointmentId);
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
    mutationFn: async (
      data: Omit<Appointment, "id" | "company_id" | "created_at" | "updated_at" | "confirmation_sent" | "confirmation_sent_at">
    ) => {
      const companyId = await getCurrentCompanyId();

      await validateAppointmentInput(companyId, data);

      const { data: result, error } = await supabase
        .from("appointments")
        .insert([
          {
            ...data,
            company_id: companyId,
          },
        ])
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
        .select("id, status, company_id, professional_id, service_id, contact_id, date, start_time, end_time, notes")
        .eq("id", id)
        .single();

      if (!before?.company_id) {
        throw new Error("Agendamento não encontrado");
      }

      const nextPayload: AppointmentMutationInput = {
        professional_id: data.professional_id ?? before.professional_id,
        service_id: data.service_id ?? before.service_id,
        contact_id: data.contact_id ?? before.contact_id,
        date: data.date ?? before.date,
        start_time: data.start_time ?? before.start_time,
        end_time: data.end_time ?? before.end_time,
        notes: data.notes ?? before.notes ?? undefined,
        status: data.status ?? before.status,
      };

      const requiresSchedulingValidation =
        data.professional_id !== undefined ||
        data.service_id !== undefined ||
        data.contact_id !== undefined ||
        data.date !== undefined ||
        data.start_time !== undefined ||
        data.end_time !== undefined;

      if (requiresSchedulingValidation) {
        await validateAppointmentInput(before.company_id, nextPayload, id);
      }

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
        await logAudit("appointment_updated", result.company_id, result.id, result as AppointmentAuditPayload);
        if (before.status && result.status && before.status !== result.status) {
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
        await logAudit("appointment_cancelled", result.company_id, result.id, result as AppointmentAuditPayload, reason);
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
          confirmation_sent_at: new Date().toISOString(),
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
        await logAudit("appointment_confirmed", result.company_id, result.id, result as AppointmentAuditPayload);
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
        await logAudit("appointment_completed", result.company_id, result.id, result as AppointmentAuditPayload);
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

      const { error } = await supabase.from("appointments").delete().eq("id", id);

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
        await logAudit("appointment_no_show", result.company_id, result.id, result as AppointmentAuditPayload);
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

export const getAppointmentEndTime = (startTime: string, durationInMinutes: number) => {
  const [hours, minutes] = startTime.split(":").map(Number);
  const startDate = new Date();
  startDate.setHours(hours, minutes, 0);

  const endDate = addMinutes(startDate, durationInMinutes);
  return format(endDate, "HH:mm");
};

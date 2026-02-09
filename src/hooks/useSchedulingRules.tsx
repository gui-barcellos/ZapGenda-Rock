import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SchedulingRules {
  min_advance_hours: number;
  max_advance_days: number;
  min_advance_hours_ai: number;
  max_advance_days_ai: number;
  min_advance_hours_manual: number;
  max_advance_days_manual: number;
  scheduling_mode: 'rolling' | 'monthly';
  open_next_month_on_day: number;
  months_ahead_visible: number;
  opening_type: 'date_range' | 'week_defined';
  opening_start_day: number;
  opening_end_day: number;
  opening_week: 'first' | 'second' | 'third' | 'fourth' | 'last' | null;
  auto_mark_no_show_enabled: boolean;
  auto_mark_no_show_hours: number;
}

const logAudit = async (
  companyId: string,
  payloadBefore: any,
  payloadAfter: any
) => {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const actorId = auth?.user?.id || null;
    await supabase.from("audit_logs").insert({
      company_id: companyId,
      actor_user_id: actorId,
      actor_type: "user",
      action: "scheduling_rules_updated",
      entity_type: "scheduling_rules",
      entity_id: companyId,
      payload_before: payloadBefore ?? null,
      payload_after: payloadAfter ?? null,
    });
  } catch {
    // non-blocking
  }
};

export const useSchedulingRules = () => {
  const queryClient = useQueryClient();

  const { data: rules, isLoading } = useQuery({
    queryKey: ["scheduling-rules"],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      const { data, error } = await supabase
        .from("company_settings")
        .select("min_advance_hours, max_advance_days, min_advance_hours_ai, max_advance_days_ai, min_advance_hours_manual, max_advance_days_manual, scheduling_mode, open_next_month_on_day, months_ahead_visible, opening_type, opening_start_day, opening_end_day, opening_week, auto_mark_no_show_enabled, auto_mark_no_show_hours")
        .eq("company_id", profile.company_id)
        .single();

      if (error) throw error;
      return data as unknown as SchedulingRules;
    },
  });

  const updateRules = useMutation({
    mutationFn: async (rules: SchedulingRules) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      const { data: before } = await supabase
        .from("company_settings")
        .select("min_advance_hours, max_advance_days, min_advance_hours_ai, max_advance_days_ai, min_advance_hours_manual, max_advance_days_manual, scheduling_mode, open_next_month_on_day, months_ahead_visible, opening_type, opening_start_day, opening_end_day, opening_week, auto_mark_no_show_enabled, auto_mark_no_show_hours")
        .eq("company_id", profile.company_id)
        .single();

      const { error } = await supabase
        .from("company_settings")
        .update(rules)
        .eq("company_id", profile.company_id);

      if (error) throw error;

      await logAudit(profile.company_id, before, rules);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduling-rules"] });
      toast.success("Regras de agendamento atualizadas com sucesso");
    },
    onError: () => {
      toast.error("Erro ao atualizar regras de agendamento");
    },
  });

  return {
    rules,
    isLoading,
    updateRules,
  };
};

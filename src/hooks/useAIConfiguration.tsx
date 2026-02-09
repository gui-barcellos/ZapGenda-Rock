import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "./useAuth";

export interface AIConfiguration {
  id: string;
  company_id: string;
  ai_enabled: boolean;
  ai_name: string;
  ai_personality: string;
  ai_personality_type: 'acolhedora' | 'eficiente' | 'amigavel';
  ai_tone: 'formal' | 'neutro' | 'casual';
  greeting_message: string;
  greeting_show_always: boolean;
  greeting_time_based: boolean;
  ai_instructions: string | null;
  custom_faqs: any;
  escalation_rules: string;
  escalation_sound_enabled: boolean;
  escalation_sound_type: 'notification1' | 'notification2' | 'notification3';
  urgency_rules: string;
  urgency_sound_enabled: boolean;
  urgency_sound_type: 'alert1' | 'alert2' | 'alert3';
  scheduling_mode: string;
  show_next_slots: number;
}

export function useAIConfiguration() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["ai-configuration", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("User not found");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      if (!profile?.company_id) throw new Error("Company ID not found");

      const { data, error } = await supabase
        .from("company_ai_settings")
        .select("*")
        .eq("company_id", profile.company_id)
        .single();

      if (error) throw error;
      return data as AIConfiguration;
    },
    enabled: !!user?.id,
  });
}

export function useUpdateAIConfiguration() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (updates: Partial<AIConfiguration>) => {
      if (!user?.id) throw new Error("User not found");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      if (!profile?.company_id) throw new Error("Company ID not found");

      const { error } = await supabase
        .from("company_ai_settings")
        .update(updates)
        .eq("company_id", profile.company_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-configuration"] });
      toast.success("Configurações da IA atualizadas com sucesso");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar configurações: ${error.message}`);
    },
  });
}

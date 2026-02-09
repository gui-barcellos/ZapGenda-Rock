import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MasterPrompt {
  id: string;
  prompt: string;
  model?: string;
  temperature?: number | null;
  top_p?: number | null;
  max_tokens?: number;
  context_window?: number;
  state_expiration_minutes?: number;
  paragraph_delay_seconds?: number;
  updated_at: string | null;
  updated_by: string | null;
}

export const useMasterPrompt = () => {
  return useQuery({
    queryKey: ["master-prompt"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_master_prompt")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error("Error fetching master prompt:", error);
        throw error;
      }

      return data as MasterPrompt;
    },
  });
};

export const useUpdateMasterPrompt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<MasterPrompt>) => {
      const { data: currentPrompt } = await supabase
        .from("ai_master_prompt")
        .select("id")
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      if (!currentPrompt) {
        throw new Error("Master prompt not found");
      }

      const { data, error } = await supabase
        .from("ai_master_prompt")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentPrompt.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master-prompt"] });
      toast.success("Configurações salvas!", { duration: 1500 });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });
};

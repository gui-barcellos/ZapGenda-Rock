import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";

export interface ActionDefinition {
  id: string;
  action_hashtag: string;
  name: string;
  description: string | null;
  category: string | null;
  handler: string;
  parameters: Json | null;
  is_active: boolean | null;
  response_instruction: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export function useActionDefinitions() {
  const queryClient = useQueryClient();

  const { data: actions, isLoading } = useQuery({
    queryKey: ["action-definitions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_action_definitions")
        .select("*")
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      return data as ActionDefinition[];
    },
  });

  const updateAction = useMutation({
    mutationFn: async ({ id, description, is_active, response_instruction }: { id: string; description?: string; is_active?: boolean; response_instruction?: string }) => {
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (description !== undefined) updates.description = description;
      if (is_active !== undefined) updates.is_active = is_active;
      if (response_instruction !== undefined) updates.response_instruction = response_instruction;

      const { error } = await supabase
        .from("ai_action_definitions")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["action-definitions"] });
      toast.success("Função atualizada", { duration: 1500 });
    },
    onError: (error) => {
      console.error("Error updating action definition:", error);
      toast.error("Erro ao atualizar função");
    },
  });

  return {
    actions,
    isLoading,
    updateAction,
  };
}

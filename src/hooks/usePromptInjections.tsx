import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PromptInjection {
  id: string;
  key: string;
  name: string;
  category: string;
  content: string;
  variables: string[] | null;
  description: string | null;
  is_active: boolean | null;
  updated_at: string | null;
}

export function usePromptInjections() {
  const queryClient = useQueryClient();

  const { data: injections, isLoading } = useQuery({
    queryKey: ["prompt-injections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_prompt_injections")
        .select("*")
        .order("category", { ascending: true });

      if (error) throw error;
      return data as PromptInjection[];
    },
  });

  const updateInjection = useMutation({
    mutationFn: async ({ id, content, is_active }: { id: string; content?: string; is_active?: boolean }) => {
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (content !== undefined) updates.content = content;
      if (is_active !== undefined) updates.is_active = is_active;

      const { error } = await supabase
        .from("ai_prompt_injections")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompt-injections"] });
      toast.success("Prompt atualizado", { duration: 1500 });
    },
    onError: (error) => {
      console.error("Error updating prompt injection:", error);
      toast.error("Erro ao atualizar prompt");
    },
  });

  return {
    injections,
    isLoading,
    updateInjection,
  };
}

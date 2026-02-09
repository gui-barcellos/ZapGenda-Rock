import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useOpenAISettings() {
  const queryClient = useQueryClient();

  const { data: maskedKey, isLoading } = useQuery({
    queryKey: ["openai-masked-key"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_masked_api_key");
      if (error) throw error;
      return data as string | null;
    },
  });

  const updateKey = useMutation({
    mutationFn: async ({ newKey, password }: { newKey: string; password: string }) => {
      // Validate password by attempting to sign in
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user?.email) {
        throw new Error("Usuário não autenticado");
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: session.session.user.email,
        password: password,
      });

      if (authError) {
        throw new Error("Senha incorreta");
      }

      // Delete old keys
      await supabase.from("openai_settings").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      // Insert new key
      const { error } = await supabase.from("openai_settings").insert({
        api_key: newKey,
        updated_by: session.session.user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["openai-masked-key"] });
      toast.success("Chave OpenAI atualizada com sucesso");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    maskedKey,
    isLoading,
    updateKey,
  };
}

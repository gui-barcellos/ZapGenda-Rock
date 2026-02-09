import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useZAPISettings = () => {
  const queryClient = useQueryClient();

  const { data: maskedToken, isLoading } = useQuery({
    queryKey: ["zapi-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_masked_zapi_client_token");
      if (error) throw error;
      return data;
    },
  });

  const updateToken = useMutation({
    mutationFn: async ({ clientToken, password }: { clientToken: string; password: string }) => {
      // Validar senha do usuário
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: (await supabase.auth.getUser()).data.user?.email || "",
        password,
      });

      if (signInError) {
        throw new Error("Senha incorreta");
      }

      // Deletar registro antigo (se existir)
      await supabase.from("zapi_settings").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      // Inserir novo token
      const { error: insertError } = await supabase
        .from("zapi_settings")
        .insert({
          client_token: clientToken,
          updated_by: (await supabase.auth.getUser()).data.user?.id,
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zapi-settings"] });
      toast.success("Client Token Z-API atualizado com sucesso");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao atualizar Client Token Z-API");
    },
  });

  return {
    maskedToken,
    isLoading,
    updateToken,
  };
};

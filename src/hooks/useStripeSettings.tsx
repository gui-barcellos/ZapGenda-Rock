import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useStripeSettings() {
  const queryClient = useQueryClient();

  const { data: maskedKey, isLoading } = useQuery({
    queryKey: ["stripe-masked-key"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_masked_stripe_key");
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

      // Validate Stripe key format
      if (!newKey.startsWith('sk_test_') && !newKey.startsWith('sk_live_')) {
        throw new Error("Chave Stripe inválida. Deve começar com 'sk_test_' ou 'sk_live_'");
      }

      // Delete old keys
      await supabase.from("stripe_settings").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      // Insert new key
      const { error } = await supabase.from("stripe_settings").insert({
        api_key: newKey,
        updated_by: session.session.user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stripe-masked-key"] });
      toast.success("Chave Stripe atualizada com sucesso");
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

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useAffiliateStripe(affiliateId?: string) {
  return useQuery({
    queryKey: ["affiliate-stripe", affiliateId],
    queryFn: async () => {
      if (!affiliateId) return null;
      const { data, error } = await supabase
        .from("affiliates_stripe")
        .select("*")
        .eq("affiliate_id", affiliateId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!affiliateId,
  });
}

export function useStartAffiliateStripeOnboarding() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "affiliate-stripe-onboarding",
        { body: {} }
      );
      if (error) throw error;
      if (!data?.url) throw new Error("URL de onboarding não retornada");
      return data.url as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["affiliate-stripe"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao conectar Stripe",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useRefreshAffiliateStripeStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "affiliate-stripe-refresh",
        { body: {} }
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["affiliate-stripe"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar Stripe",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useSuperuserAffiliates() {
  return useQuery({
    queryKey: ["superuser-affiliates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useSuperuserAffiliateCompanies() {
  return useQuery({
    queryKey: ["superuser-affiliate-companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_companies")
        .select(`
          id,
          status,
          affiliate:affiliates(id, name),
          company:companies(id, name, status)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useAssignAffiliateCompany() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { companyId: string; affiliateId: string | null }) => {
      const { companyId, affiliateId } = params;

      const { error: deleteError } = await supabase
        .from("affiliate_companies")
        .delete()
        .eq("company_id", companyId);

      if (deleteError) throw deleteError;

      if (affiliateId) {
        const { error: insertError } = await supabase
          .from("affiliate_companies")
          .insert({
            company_id: companyId,
            affiliate_id: affiliateId,
            status: "active",
          });

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["superuser-affiliate-companies"] });
      toast({
        title: "Afiliado atualizado!",
        description: "O vinculo foi atualizado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar afiliado",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useSuperuserAffiliateCommissions() {
  return useQuery({
    queryKey: ["superuser-affiliate-commissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_commissions")
        .select(`
          id,
          invoice_id,
          payout_id,
          amount,
          currency,
          status,
          period_start,
          period_end,
          created_at,
          affiliate:affiliates(id, name),
          company:companies(id, name)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useSuperuserAffiliatePayouts() {
  return useQuery({
    queryKey: ["superuser-affiliate-payouts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_payouts")
        .select(`
          id,
          affiliate_id,
          amount,
          currency,
          status,
          stripe_payout_id,
          created_at,
          affiliate:affiliates(id, name, email)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useApproveAffiliatePayout() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payoutId: string) => {
      const { error } = await supabase
        .from("affiliate_payouts")
        .update({ status: "approved" })
        .eq("id", payoutId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superuser-affiliate-payouts"] });
      toast({ title: "Payout aprovado!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao aprovar payout",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function usePayAffiliatePayout() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payoutId: string) => {
      const { data, error } = await supabase.functions.invoke("affiliate-payout-pay", {
        body: { payout_id: payoutId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superuser-affiliate-payouts"] });
      queryClient.invalidateQueries({ queryKey: ["superuser-affiliate-commissions"] });
      toast({ title: "Payout pago!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao pagar payout",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

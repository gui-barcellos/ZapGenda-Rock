import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useAffiliate() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["affiliate", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("affiliates")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
}

export function useAffiliateCompanies(affiliateId?: string) {
  return useQuery({
    queryKey: ["affiliate-companies", affiliateId],
    queryFn: async () => {
      if (!affiliateId) return [];
      const { data, error } = await supabase
        .from("affiliate_companies")
        .select(`
          id,
          status,
          commission_start_at,
          commission_end_at,
          cancelled_at,
          company:companies(id, name, status)
        `)
        .eq("affiliate_id", affiliateId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!affiliateId,
  });
}

export function useAffiliateCommissions(affiliateId?: string) {
  return useQuery({
    queryKey: ["affiliate-commissions", affiliateId],
    queryFn: async () => {
      if (!affiliateId) return [];
      const { data, error } = await supabase
        .from("affiliate_commissions")
        .select(`
          id,
          amount,
          currency,
          status,
          period_start,
          period_end,
          created_at,
          company:companies(id, name)
        `)
        .eq("affiliate_id", affiliateId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!affiliateId,
  });
}

export function useAffiliatePayouts(affiliateId?: string) {
  return useQuery({
    queryKey: ["affiliate-payouts", affiliateId],
    queryFn: async () => {
      if (!affiliateId) return [];
      const { data, error } = await supabase
        .from("affiliate_payouts")
        .select("*")
        .eq("affiliate_id", affiliateId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!affiliateId,
  });
}

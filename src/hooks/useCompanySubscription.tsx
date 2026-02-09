import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCompanySubscription() {
  const { data: subscription, isLoading } = useQuery({
    queryKey: ["company-subscription"],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) return null;

      const { data } = await supabase
        .from("company_subscriptions")
        .select("*")
        .eq("company_id", profile.company_id)
        .single();

      return data;
    },
  });

  return { subscription, isLoading };
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook para verificar se uma feature flag está ativada para a empresa do usuário atual
 * 
 * @param featureName - Nome da feature (ex: "new_ai_assistant", "advanced_reports")
 * @returns boolean indicando se a feature está ativada
 * 
 * @example
 * ```tsx
 * const { data: isNewFeatureEnabled } = useFeatureFlag("new_ai_assistant");
 * 
 * return (
 *   <div>
 *     {isNewFeatureEnabled && <NewAIAssistant />}
 *     {!isNewFeatureEnabled && <OldAssistant />}
 *   </div>
 * );
 * ```
 */
export const useFeatureFlag = (featureName: string) => {
  return useQuery({
    queryKey: ["feature-flag", featureName],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) return false;

      const { data } = await supabase
        .from("feature_flags")
        .select("is_enabled")
        .eq("company_id", profile.company_id)
        .eq("feature_name", featureName)
        .maybeSingle();

      return data?.is_enabled ?? false;
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
};

/**
 * Hook para gerenciar feature flags (apenas para superusers)
 */
export const useManageFeatureFlag = () => {
  return {
    async toggleFeatureFlag(companyId: string, featureName: string, isEnabled: boolean) {
      const { error } = await supabase
        .from("feature_flags")
        .upsert({
          company_id: companyId,
          feature_name: featureName,
          is_enabled: isEnabled,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "company_id,feature_name"
        });

      if (error) throw error;
    }
  };
};

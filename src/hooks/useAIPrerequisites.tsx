import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useAIPrerequisites() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["ai-prerequisites", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");

      // Busca company_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) throw new Error("Company not found");
      
      const companyId = profile.company_id;

      // ========== VALIDAÇÕES ==========
      
      // 1. Profissionais (mínimo 1 ativo)
      const { count: profCount } = await supabase
        .from("professionals")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("is_active", true);

      // 2. Serviços (mínimo 1 ativo)
      const { count: serviceCount } = await supabase
        .from("services")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("is_active", true);

      // 3. Disponibilidade (mínimo 1 ativa)
      const { count: availCount } = await supabase
        .from("availability")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("is_active", true);

      // 4. Nome da empresa
      const { data: company } = await supabase
        .from("companies")
        .select("name")
        .eq("id", companyId)
        .single();

      // 5. Dados da empresa (endereço e horário de funcionamento)
      const { data: settings } = await supabase
        .from("company_settings")
        .select("address, business_hours")
        .eq("company_id", companyId)
        .single();

      // 6. Configurações de IA obrigatórias
      const { data: aiConfig } = await supabase
        .from("company_ai_settings")
        .select("ai_name, escalation_rules, urgency_rules")
        .eq("company_id", companyId)
        .single();

      // Validação de business_hours (precisa ter pelo menos 1 dia ativo)
      const hasBusinessHours = Array.isArray(settings?.business_hours) && 
        settings.business_hours.some((h: any) => h.is_active === true);

      // ========== RESULTADO ==========
      
      const prerequisites = {
        hasProfessionals: (profCount ?? 0) > 0,
        hasServices: (serviceCount ?? 0) > 0,
        hasAvailability: (availCount ?? 0) > 0,
        hasCompanyName: !!company?.name && company.name.trim() !== "",
        hasAddress: !!settings?.address && settings.address.trim() !== "",
        hasBusinessHours: !!hasBusinessHours,
        hasAIName: !!aiConfig?.ai_name && aiConfig.ai_name.trim() !== "",
        hasEscalationRules: !!aiConfig?.escalation_rules && aiConfig.escalation_rules.trim() !== "",
        hasUrgencyRules: !!aiConfig?.urgency_rules && aiConfig.urgency_rules.trim() !== "",
      };

      return {
        ...prerequisites,
        
        // Computed: pode ativar IA?
        canEnableAI: 
          prerequisites.hasProfessionals &&
          prerequisites.hasServices &&
          prerequisites.hasAvailability &&
          prerequisites.hasCompanyName &&
          prerequisites.hasAddress &&
          prerequisites.hasBusinessHours &&
          prerequisites.hasAIName &&
          prerequisites.hasEscalationRules &&
          prerequisites.hasUrgencyRules,
        
        // Computed: lista de itens faltantes
        missingItems: [
          !prerequisites.hasProfessionals && "Cadastre pelo menos 1 profissional ativo",
          !prerequisites.hasServices && "Cadastre pelo menos 1 serviço ativo",
          !prerequisites.hasAvailability && "Configure disponibilidade para pelo menos 1 profissional",
          !prerequisites.hasCompanyName && "Preencha o nome da empresa em Dados da Empresa",
          !prerequisites.hasAddress && "Preencha o endereço da empresa em Dados da Empresa",
          !prerequisites.hasBusinessHours && "Configure horário de funcionamento da empresa",
          !prerequisites.hasAIName && "Defina o nome da IA nesta página",
          !prerequisites.hasEscalationRules && "Configure quando chamar humano nesta página",
          !prerequisites.hasUrgencyRules && "Configure alertas de urgência nesta página",
        ].filter(Boolean) as string[],
      };
    },
    enabled: !!user?.id,
    refetchInterval: 5000, // Revalida a cada 5 segundos
  });
}

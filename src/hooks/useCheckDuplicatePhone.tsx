import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { normalizePhoneWithCountryCode } from "@/lib/phone-utils";

export const useCheckDuplicatePhone = (phone: string, excludeContactId?: string) => {
  return useQuery({
    queryKey: ["check-duplicate-phone", phone, excludeContactId],
    queryFn: async () => {
      if (!phone || phone.length < 10) {
        return null;
      }

      // Normalizar telefone com DDI
      const normalizedPhone = normalizePhoneWithCountryCode(phone);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) throw new Error("Perfil não encontrado");

      // Buscar por telefone principal OU secundário
      let query = supabase
        .from("contacts")
        .select("id, name, phone, secondary_phone")
        .eq("company_id", profile.company_id)
        .or(`phone.eq.${normalizedPhone},secondary_phone.eq.${normalizedPhone}`);

      // Exclude current contact if editing
      if (excludeContactId) {
        query = query.neq("id", excludeContactId);
      }

      const { data } = await query.maybeSingle();

      return data;
    },
    enabled: phone.length >= 10,
  });
};

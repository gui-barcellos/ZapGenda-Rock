import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPhoneDisplay } from "@/lib/phone-utils";

export const useConnectedWhatsApp = (companyId: string | null) => {
  return useQuery({
    queryKey: ["connected-whatsapp", companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const { data, error } = await supabase
        .from("whatsapp_connections")
        .select("phone, is_connected, name")
        .eq("company_id", companyId)
        .eq("is_connected", true)
        .limit(1)
        .single();

      if (error || !data) return null;

      return {
        phone: data.phone,
        formattedPhone: formatPhoneDisplay(data.phone),
        name: data.name,
        isConnected: data.is_connected,
      };
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

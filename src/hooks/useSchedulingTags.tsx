import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SchedulingTag {
  id: string;
  name: string;
  color: string;
}

export function useSchedulingTags() {
  return useQuery({
    queryKey: ["scheduling-tags"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      const { data, error } = await supabase
        .from("tag_registry")
        .select("id, name, color")
        .eq("company_id", profile.company_id)
        .eq("category", "Agendamento")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data as SchedulingTag[];
    },
  });
}

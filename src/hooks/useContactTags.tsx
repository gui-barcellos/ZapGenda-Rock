import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useContactTags = (contactId?: string) => {
  return useQuery({
    queryKey: ["contact-tags", contactId],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      if (!contactId) {
        // Retornar todas as tags usadas na empresa
        const { data } = await supabase
          .from("contacts")
          .select("tags")
          .eq("company_id", profile.company_id);
        
        const allTags = new Set<string>();
        data?.forEach(contact => {
          contact.tags?.forEach((tag: string) => allTags.add(tag));
        });
        
        return Array.from(allTags);
      }

      // Retornar tags de um contato específico
      const { data } = await supabase
        .from("contacts")
        .select("tags")
        .eq("id", contactId)
        .single();
      
      return data?.tags || [];
    },
  });
};

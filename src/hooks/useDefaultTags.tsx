import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const useCreateDefaultTags = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      const { error } = await supabase.rpc("create_default_tags_for_company", {
        _company_id: profile.company_id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tag-registry"] });
      queryClient.invalidateQueries({ queryKey: ["contact-tags"] });
      toast({ 
        title: "Tags padrão criadas com sucesso!",
        description: "As tags sugeridas foram adicionadas ao seu sistema."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar tags padrão",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

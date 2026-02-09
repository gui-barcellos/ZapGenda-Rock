import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const useBulkAddTags = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contactIds,
      tags,
    }: {
      contactIds: string[];
      tags: string[];
    }) => {
      // Process in chunks of 50 for performance
      const chunkSize = 50;
      let totalUpdated = 0;

      for (let i = 0; i < contactIds.length; i += chunkSize) {
        const chunk = contactIds.slice(i, i + chunkSize);

        // Get current tags for each contact in chunk
        const { data: contacts, error: fetchError } = await supabase
          .from("contacts")
          .select("id, tags")
          .in("id", chunk);

        if (fetchError) throw fetchError;

        // Update each contact with merged tags
        const updates = contacts?.map((contact) => {
          const currentTags = contact.tags || [];
          const mergedTags = Array.from(
            new Set([...currentTags, ...tags])
          );
          return supabase
            .from("contacts")
            .update({ tags: mergedTags })
            .eq("id", contact.id);
        });

        if (updates) {
          await Promise.all(updates);
          totalUpdated += contacts.length;
        }
      }

      return totalUpdated;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contact-tags"] });
      toast({
        title: "Tags adicionadas!",
        description: `${count} contato(s) atualizado(s)`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao adicionar tags",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useBulkRemoveTags = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contactIds,
      tags,
    }: {
      contactIds: string[];
      tags: string[];
    }) => {
      const chunkSize = 50;
      let totalUpdated = 0;

      for (let i = 0; i < contactIds.length; i += chunkSize) {
        const chunk = contactIds.slice(i, i + chunkSize);

        const { data: contacts, error: fetchError } = await supabase
          .from("contacts")
          .select("id, tags")
          .in("id", chunk);

        if (fetchError) throw fetchError;

        const updates = contacts?.map((contact) => {
          const currentTags = contact.tags || [];
          const filteredTags = currentTags.filter(
            (tag) => !tags.includes(tag)
          );
          return supabase
            .from("contacts")
            .update({ tags: filteredTags })
            .eq("id", contact.id);
        });

        if (updates) {
          await Promise.all(updates);
          totalUpdated += contacts.length;
        }
      }

      return totalUpdated;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contact-tags"] });
      toast({
        title: "Tags removidas!",
        description: `${count} contato(s) atualizado(s)`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover tags",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

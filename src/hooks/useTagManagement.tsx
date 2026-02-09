import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface TagRegistry {
  id: string;
  company_id: string;
  name: string;
  color: string;
  category: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  is_system_tag?: boolean;
  is_editable?: boolean;
  show_in_chat?: boolean;
  blocks_ai?: boolean;
  triggers_alert?: boolean;
  alert_sound_enabled?: boolean;
  is_auto_generated?: boolean;
  auto_source?: string | null;
  linked_entity_id?: string | null;
}

export const useTagRegistry = () => {
  return useQuery({
    queryKey: ["tag-registry"],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      const { data, error } = await supabase
        .from("tag_registry")
        .select("*")
        .eq("company_id", profile.company_id)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data as TagRegistry[];
    },
  });
};

export const useCreateTagInRegistry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tag: {
      name: string;
      color?: string;
      category?: string;
      description?: string;
      show_in_chat?: boolean;
    }) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      // Verificar limite de tags customizadas
      const { data: subscription } = await supabase
        .from("company_subscriptions")
        .select("max_custom_tags")
        .eq("company_id", profile.company_id)
        .single();

      const { data: currentTags } = await supabase
        .from("tag_registry")
        .select("id")
        .eq("company_id", profile.company_id)
        .eq("is_auto_generated", false);

      const customTagsCount = currentTags?.length || 0;
      const maxTags = subscription?.max_custom_tags || 50;

      if (customTagsCount >= maxTags) {
        throw new Error(`Limite de ${maxTags} tags customizadas atingido. Considere remover tags não utilizadas.`);
      }

      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("tag_registry")
        .insert({
          company_id: profile.company_id,
          name: tag.name,
          color: tag.color || "#3b82f6",
          category: tag.category,
          description: tag.description,
          show_in_chat: tag.show_in_chat || false,
          created_by: user.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tag-registry"] });
      queryClient.invalidateQueries({ queryKey: ["contact-tags"] });
      toast({ title: "Tag criada com sucesso!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar tag",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useRenameTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      oldName,
      newName,
    }: {
      oldName: string;
      newName: string;
    }) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      const { error } = await supabase.rpc("rename_tag_globally", {
        _company_id: profile.company_id,
        _old_name: oldName,
        _new_name: newName,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tag-registry"] });
      queryClient.invalidateQueries({ queryKey: ["contact-tags"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast({ title: "Tag renomeada com sucesso!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao renomear tag",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useDeleteTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tagName: string) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      const { data, error } = await supabase.rpc("delete_tag_globally", {
        _company_id: profile.company_id,
        _tag_name: tagName,
      });

      if (error) throw error;
      return data as number;
    },
    onSuccess: (affectedCount) => {
      queryClient.invalidateQueries({ queryKey: ["tag-registry"] });
      queryClient.invalidateQueries({ queryKey: ["contact-tags"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast({
        title: "Tag deletada com sucesso!",
        description: `${affectedCount} contato(s) atualizado(s)`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao deletar tag",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateTagMetadata = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      color,
      category,
      description,
      show_in_chat,
    }: {
      id: string;
      color?: string;
      category?: string;
      description?: string;
      show_in_chat?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("tag_registry")
        .update({
          color,
          category,
          description,
          show_in_chat,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tag-registry"] });
      toast({ title: "Tag atualizada com sucesso!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar tag",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useTagUsageCount = (tagName: string) => {
  return useQuery({
    queryKey: ["tag-usage", tagName],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      const { count, error } = await supabase
        .from("contacts")
        .select("*", { count: "exact", head: true })
        .eq("company_id", profile.company_id)
        .contains("tags", [tagName]);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!tagName,
  });
};

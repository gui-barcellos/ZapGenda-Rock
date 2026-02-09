import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface TagAutomationRule {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  trigger_event: string;
  conditions: any;
  tags_to_add: string[] | null;
  tags_to_remove: string[] | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
}

export const useAutomationRules = () => {
  return useQuery({
    queryKey: ["tag-automation-rules"],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      const { data, error } = await supabase
        .from("tag_automation_rules")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as TagAutomationRule[];
    },
  });
};

export const useCreateAutomationRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rule: {
      name: string;
      description?: string;
      trigger_event: string;
      conditions?: any;
      tags_to_add?: string[];
      tags_to_remove?: string[];
    }) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("tag_automation_rules")
        .insert({
          company_id: profile.company_id,
          name: rule.name,
          description: rule.description,
          trigger_event: rule.trigger_event,
          conditions: rule.conditions,
          tags_to_add: rule.tags_to_add,
          tags_to_remove: rule.tags_to_remove,
          created_by: user.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tag-automation-rules"] });
      toast({ title: "Regra de automação criada!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar regra",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateAutomationRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<TagAutomationRule> & { id: string }) => {
      const { data, error } = await supabase
        .from("tag_automation_rules")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tag-automation-rules"] });
      toast({ title: "Regra atualizada!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar regra",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useDeleteAutomationRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tag_automation_rules")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tag-automation-rules"] });
      toast({ title: "Regra deletada!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao deletar regra",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useToggleAutomationRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data, error } = await supabase
        .from("tag_automation_rules")
        .update({ is_active: isActive })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tag-automation-rules"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao alternar regra",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

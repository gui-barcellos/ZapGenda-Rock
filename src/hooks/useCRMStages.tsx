import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface CRMStage {
  id: string;
  company_id: string;
  name: string;
  color: string;
  order_position: number;
  is_active: boolean;
  created_at: string;
}

export const useCRMStages = (companyId?: string) => {
  return useQuery({
    queryKey: ["crm-stages", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from("crm_stages")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("order_position");

      if (error) throw error;
      return data as CRMStage[];
    },
    enabled: !!companyId,
  });
};

export const useUpdateStage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      stageId,
      updates,
    }: {
      stageId: string;
      updates: Partial<CRMStage>;
    }) => {
      const { error } = await supabase
        .from("crm_stages")
        .update(updates)
        .eq("id", stageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-stages"] });
      toast({ title: "Estágio atualizado com sucesso" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar estágio",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useCreateStage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (stage: Omit<CRMStage, "id" | "created_at">) => {
      const { error } = await supabase.from("crm_stages").insert(stage);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-stages"] });
      toast({ title: "Estágio criado com sucesso" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar estágio",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useDeleteStage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (stageId: string) => {
      const { error } = await supabase
        .from("crm_stages")
        .update({ is_active: false })
        .eq("id", stageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-stages"] });
      toast({ title: "Estágio desativado com sucesso" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao desativar estágio",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface CRMContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  company_id?: string;
  funnel_stage: string;
  assigned_to_user_id?: string;
  estimated_value?: number;
  last_contact_date?: string;
  next_follow_up?: string;
  pipeline_notes?: string;
  lead_source?: string;
  lost_reason?: string;
  moved_to_stage_at: string;
  created_at: string;
  tags?: string[];
}

export interface CRMFilters {
  assignedTo?: string;
  stage?: string;
  minValue?: number;
  maxValue?: number;
  search?: string;
}

export const useCRMContacts = (filters?: CRMFilters) => {
  return useQuery({
    queryKey: ["crm-contacts", filters],
    queryFn: async () => {
      let query = supabase
        .from("contacts")
        .select("*")
        .order("moved_to_stage_at", { ascending: false });

      if (filters?.assignedTo) {
        query = query.eq("assigned_to_user_id", filters.assignedTo);
      }
      if (filters?.stage) {
        query = query.eq("funnel_stage", filters.stage);
      }
      if (filters?.minValue) {
        query = query.gte("estimated_value", filters.minValue);
      }
      if (filters?.maxValue) {
        query = query.lte("estimated_value", filters.maxValue);
      }
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CRMContact[];
    },
  });
};

export const useMoveContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contactId,
      newStage,
      notes,
    }: {
      contactId: string;
      newStage: string;
      notes?: string;
    }) => {
      const followUpDays: Record<string, number> = {
        lead_novo: 1,
        em_contato: 3,
        proposta_enviada: 2,
        em_negociacao: 5,
      };

      const nextFollowUp = new Date();
      nextFollowUp.setDate(nextFollowUp.getDate() + (followUpDays[newStage] || 3));

      const { error } = await supabase
        .from("contacts")
        .update({
          funnel_stage: newStage,
          moved_to_stage_at: new Date().toISOString(),
          next_follow_up: nextFollowUp.toISOString().split("T")[0],
        })
        .eq("id", contactId);

      if (error) throw error;

      if (notes) {
        const { data: contact } = await supabase
          .from("contacts")
          .select("company_id")
          .eq("id", contactId)
          .single();

        if (contact) {
          await supabase.from("crm_history").insert({
            contact_id: contactId,
            company_id: contact.company_id,
            action_type: "note_added",
            notes,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-contacts"] });
      toast({ title: "Contato movido com sucesso" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao mover contato",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateContactValue = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contactId,
      estimatedValue,
    }: {
      contactId: string;
      estimatedValue: number;
    }) => {
      const { error } = await supabase
        .from("contacts")
        .update({ estimated_value: estimatedValue })
        .eq("id", contactId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-contacts"] });
      toast({ title: "Valor atualizado com sucesso" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar valor",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useAssignContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contactId,
      userId,
    }: {
      contactId: string;
      userId: string | null;
    }) => {
      const { error } = await supabase
        .from("contacts")
        .update({ assigned_to_user_id: userId })
        .eq("id", contactId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-contacts"] });
      toast({ title: "Responsável atualizado com sucesso" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar responsável",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useAddNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contactId,
      companyId,
      notes,
    }: {
      contactId: string;
      companyId: string;
      notes: string;
    }) => {
      const { error } = await supabase.from("crm_history").insert({
        contact_id: contactId,
        company_id: companyId,
        action_type: "note_added",
        notes,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-history"] });
      toast({ title: "Nota adicionada com sucesso" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao adicionar nota",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useCRMHistory = (contactId: string) => {
  return useQuery({
    queryKey: ["crm-history", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_history")
        .select("*, profiles(full_name)")
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!contactId,
  });
};

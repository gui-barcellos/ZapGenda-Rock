import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Contact {
  id: string;
  company_id: string;
  name: string;
  phone: string;
  secondary_phone?: string | null;
  cpf?: string | null;
  email?: string;
  birth_date?: string;
  notes?: string;
  tags?: string[];
  created_at: string;
  funnel_stage?: string;
  assigned_to_user_id?: string;
  estimated_value?: number;
  last_contact_date?: string;
  next_follow_up?: string;
  pipeline_notes?: string;
  lead_source?: string;
  lost_reason?: string;
  moved_to_stage_at?: string;
}

export const useContacts = (page: number = 1, pageSize: number = 50) => {
  return useQuery({
    queryKey: ["contacts", page, pageSize],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from("contacts")
        .select("*", { count: "exact" })
        .order("name", { ascending: true })
        .range(from, to);

      if (error) throw error;
      return { 
        contacts: data as Contact[], 
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize)
      };
    },
  });
};

export const useContactsCount = () => {
  return useQuery({
    queryKey: ["contacts-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("contacts")
        .select("*", { count: "exact", head: true });

      if (error) throw error;
      return count || 0;
    },
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });
};

export const useSearchContacts = (searchTerm: string) => {
  return useQuery({
    queryKey: ["contacts", "search", searchTerm],
    queryFn: async () => {
      if (!searchTerm) return [];

      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .order("name", { ascending: true })
        .limit(10);

      if (error) throw error;
      return data as Contact[];
    },
    enabled: searchTerm.length > 0,
  });
};

export const useContact = (contactId?: string) => {
  return useQuery({
    queryKey: ["contact", contactId],
    queryFn: async () => {
      if (!contactId) return null;

      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", contactId)
        .single();

      if (error) throw error;
      return data as Contact;
    },
    enabled: !!contactId,
  });
};

export const useCreateContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<Contact, "id" | "company_id" | "created_at">) => {
      const { data: result, error } = await supabase
        .from("contacts")
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast({
        title: "Contato criado",
        description: "O contato foi criado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar contato",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Contact> }) => {
      const { data: result, error } = await supabase
        .from("contacts")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast({
        title: "Contato atualizado",
        description: "O contato foi atualizado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar contato",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useDeleteContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contacts")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast({
        title: "Contato excluído",
        description: "O contato foi excluído com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir contato",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useContactTags = () => {
  return useQuery({
    queryKey: ["contact-tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("tags");

      if (error) throw error;

      const allTags = data
        .flatMap((contact) => contact.tags || [])
        .filter((tag, index, self) => self.indexOf(tag) === index)
        .sort();

      return allTags as string[];
    },
  });
};

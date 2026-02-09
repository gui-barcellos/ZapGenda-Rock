import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Conversation {
  id: string;
  company_id: string;
  contact_id: string;
  whatsapp_connection_id: string;
  status: string;
  assigned_to_user_id: string | null;
  last_message_at: string | null;
  created_at: string;
  is_unread: boolean;
  is_favorite: boolean;
  ai_disabled_until: string | null;
  contacts?: {
    name: string;
    phone: string;
    profile_picture_url?: string | null;
    whatsapp_push_name?: string | null;
    whatsapp_about?: string | null;
    tags?: string[] | null;
    is_blocked?: boolean;
  };
  whatsapp_connections?: {
    name: string | null;
    phone: string | null;
  };
}

export const useConversations = (filter?: 'all' | 'unread' | 'favorites') => {
  return useInfiniteQuery({
    queryKey: ["conversations", filter],
    queryFn: async ({ pageParam = 0 }) => {
      const limit = 20;
      const from = pageParam * limit;
      const to = from + limit - 1;
      
      let query: any = supabase
        .from("conversations")
        .select(`
      *,
      contacts(name, phone, profile_picture_url, whatsapp_push_name, whatsapp_about, tags, is_blocked),
      whatsapp_connections(name, phone)
        `, { count: 'exact' })
        .range(from, to)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (filter === 'unread') {
        query = query.eq("is_unread", true);
      } else if (filter === 'favorites') {
        query = query.eq("is_favorite", true);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { conversations: data as Conversation[], count };
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.conversations.length < 20) return undefined;
      return allPages.length;
    },
    initialPageParam: 0,
    staleTime: 2 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

export const useConversation = (conversationId: string | null) => {
  return useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: async () => {
      if (!conversationId) return null;

      const { data, error } = await supabase
        .from("conversations")
        .select(`
          *,
          contacts(*),
          whatsapp_connections(*)
        `)
        .eq("id", conversationId)
        .single();

      if (error) throw error;
      return data as any;
    },
    enabled: !!conversationId && conversationId !== "",
  });
};

export const useUpdateConversationStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, assigned_to_user_id }: { id: string; status: string; assigned_to_user_id?: string | null }) => {
      const { data, error } = await supabase
        .from("conversations")
        .update({ 
          status,
          ...(assigned_to_user_id !== undefined && { assigned_to_user_id }),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Status da conversa atualizado!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar conversa: ${error.message}`);
    },
  });
};

export const useDeleteConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      // 1. Deletar transcrições de áudio (by conversation)
      const { error: transcriptionError } = await supabase
        .from("audio_transcription_usage")
        .delete()
        .eq("conversation_id", conversationId);

      if (transcriptionError) throw transcriptionError;

      // 4. Deletar logs de prompts da IA (by conversation)
      const { error: promptLogsError } = await supabase
        .from("ai_prompt_logs")
        .delete()
        .eq("conversation_id", conversationId);

      if (promptLogsError) throw promptLogsError;

      // 5. Deletar todas as mensagens (by conversation)
      const { error: messagesError } = await supabase
        .from("whatsapp_messages")
        .delete()
        .eq("conversation_id", conversationId);

      if (messagesError) throw messagesError;

      // 6. Deletar a conversa (CASCADE cuida de assistant_threads)
      const { error } = await supabase
        .from("conversations")
        .delete()
        .eq("id", conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Conversa apagada!", { duration: 1500 });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao apagar conversa: ${error.message}`, { duration: 1500 });
    },
  });
};

export const useBlockContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contactId, isBlocked }: { contactId: string; isBlocked: boolean }) => {
      const { data, error } = await supabase
        .from("contacts")
        .update({ is_blocked: isBlocked })
        .eq("id", contactId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success(
        variables.isBlocked ? "Contato bloqueado!" : "Contato desbloqueado!", 
        { duration: 1500 }
      );
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`, { duration: 1500 });
    },
  });
};

export const useCreateConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      // Buscar conexão WhatsApp ativa
      const { data: connection } = await supabase
        .from("whatsapp_connections")
        .select("id")
        .eq("company_id", profile.company_id)
        .eq("is_connected", true)
        .single();

      if (!connection) throw new Error("Nenhuma conexão WhatsApp ativa encontrada");

      // Verificar se já existe conversa
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("contact_id", contactId)
        .eq("whatsapp_connection_id", connection.id)
        .single();

      if (existing) return existing;

      // Criar nova conversa
      const { data, error } = await supabase
        .from("conversations")
        .insert({
          company_id: profile.company_id,
          contact_id: contactId,
          whatsapp_connection_id: connection.id,
          status: "ai",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Conversa iniciada!", { duration: 1500 });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar conversa: ${error.message}`);
    },
  });
};

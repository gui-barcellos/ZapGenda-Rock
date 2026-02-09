import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useRef } from "react";

interface WhatsAppMessage {
  id: string;
  company_id: string;
  conversation_id: string;
  contact_id: string;
  whatsapp_connection_id: string;
  phone: string;
  direction: string;
  content: string;
  message_type: string | null;
  message_id: string | null;
  sent_by_user_id: string | null;
  read_at: string | null;
  created_at: string;
  whatsapp_timestamp: number;
}

export const useMessages = (conversationId: string | null) => {
  return useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("whatsapp_timestamp", { ascending: true });

      if (error) throw error;
      return data as WhatsAppMessage[];
    },
    enabled: !!conversationId && conversationId !== "",
  });
};


export const useSendMessage = () => {
  const queryClient = useQueryClient();
  const lastSendTime = useRef(0);

  return useMutation({
    mutationFn: async ({
      conversationId,
      contactId,
      whatsappConnectionId,
      phone,
      content,
    }: {
      conversationId: string;
      contactId: string;
      whatsappConnectionId: string;
      phone: string;
      content: string;
    }) => {
      // Rate limit: no máximo 1 mensagem a cada 500ms
      const now = Date.now();
      const timeSinceLastSend = now - lastSendTime.current;
      if (timeSinceLastSend < 500) {
        await new Promise(r => setTimeout(r, 500 - timeSinceLastSend));
      }
      lastSendTime.current = Date.now();

      // Enviar mensagem direto (confiar na validação periódica)
      const { data, error } = await supabase.functions.invoke("zapi-send-message", {
        body: {
          whatsappConnectionId,
          phone,
          message: content,
          conversationId,
          contactId,
        },
      });

      // Se erro de autenticação, marcar como desconectado
      if (error?.message?.includes("401") || error?.message?.includes("403") || error?.message?.includes("disconnected")) {
        await supabase
          .from("whatsapp_connections")
          .update({ is_connected: false })
          .eq("id", whatsappConnectionId);
      }

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao enviar mensagem");

      return data.message;
    },
    onSuccess: (newMessage, variables) => {
      // Atualizar cache diretamente (não refetch)
      queryClient.setQueryData(
        ["messages", variables.conversationId],
        (old: any[] = []) => {
          // Remover mensagens otimistas temporárias
          const filtered = old.filter(m => !m.id?.startsWith('temp-'));
          // Verificar se mensagem já existe
          if (filtered.some(m => m.id === newMessage?.id)) return old;
          // Adicionar mensagem real
          return [...filtered, newMessage];
        }
      );
      
      // Invalidar lista de conversas (leve, sem refetch)
      queryClient.invalidateQueries({ 
        queryKey: ["conversations"],
        refetchType: 'none'
      });
    },
    onError: (error: Error) => {
      if (error.message.includes("WhatsApp desconectado") || error.message.includes("desconectado")) {
        toast.error("WhatsApp Desconectado", {
          description: "Reconecte pelo painel Z-API antes de enviar mensagens.",
        });
      } else {
        toast.error(`Erro ao enviar mensagem: ${error.message}`);
      }
    },
  });
};

export const useMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId: string) => {
      const { data, error } = await supabase
        .from("whatsapp_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("id", messageId)
        .is("read_at", null)
        .select()
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });
};

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Hook unificado para Realtime - APENAS para atualização de UI
 * ⚠️ A AUTO-RESPOSTA DA IA AGORA RODA 100% SERVER-SIDE NO ZAPI-WEBHOOK-RECEIVER ⚠️
 * Este hook APENAS escuta Realtime para atualizar a interface
 * 
 * Responsabilidades:
 * - ✅ Escutar mudanças em conversations
 * - ✅ Escutar INSERT de novas mensagens
 * - ✅ Atualizar cache do React Query
 * - ✅ Reconexão automática em caso de erro
 * 
 * Responsabilidades REMOVIDAS (agora server-side):
 * - ❌ Chamar chat-ai
 * - ❌ Enviar mensagens via Z-API
 * - ❌ Verificar se IA está ativa
 */
export const useConversationRealtime = (
  conversationId: string | null
) => {
  const queryClient = useQueryClient();
  const { userRole } = useAuth();
  const lastEventTimeRef = useRef<number>(Date.now());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Função para logar apenas se for superuser
  const logToSystem = async (
    message: string,
    severity: 'debug' | 'info' | 'warn' | 'error' | 'critical',
    metadata?: Record<string, any>
  ) => {
    if (userRole !== "superuser") return;

    try {
      await supabase.from("system_logs").insert({
        log_type: "realtime",
        severity,
        source: "useConversationRealtime",
        message,
        metadata,
      });
    } catch (err) {
      console.error("Failed to log to system_logs:", err);
    }
  };

  useEffect(() => {
    if (!conversationId) return;

    const setupChannel = () => {
      logToSystem(
        `Conectando canal unificado: chat:${conversationId}`,
        "debug",
        { conversationId }
      );

      const channel = supabase
        .channel(`chat:${conversationId}`) // Nome único unificado
        // Escutar mudanças na tabela CONVERSATIONS
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "conversations",
            filter: `id=eq.${conversationId}`,
          },
          (payload) => {
            const now = Date.now();
            lastEventTimeRef.current = now;
            
            console.log("🔔 Conversation updated:", conversationId);
            
            logToSystem(
              `Conversation updated: ${conversationId}`,
              "debug",
              { 
                payload: payload.new,
                eventType: payload.eventType,
                deltaMs: now - new Date((payload.new as any)?.updated_at || Date.now()).getTime()
              }
            );

            // Invalidar queries da conversa
            queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
          }
        )
        // Escutar mudanças na tabela WHATSAPP_MESSAGES
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "whatsapp_messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const now = Date.now();
            lastEventTimeRef.current = now;
            const newMessage = payload.new as any;
            const createdAt = new Date(newMessage?.created_at || Date.now()).getTime();
            const deltaMs = now - createdAt;
            
            console.log("🔔 Nova mensagem INSERT:", {
              direction: newMessage?.direction,
              content: newMessage?.content?.substring(0, 50),
              conversationId
            });
            
            logToSystem(
              `Message INSERT received in conversation: ${conversationId}`,
              "info",
              { 
                messageId: newMessage?.id || 'unknown',
                deltaMs,
                direction: newMessage?.direction
              }
            );
            
            // Atualizar cache diretamente (não invalidar/refetch)
            queryClient.setQueryData(
              ["messages", conversationId],
              (old: any[] = []) => {
                // Evitar duplicatas
                if (old.some(m => m.id === newMessage?.id)) return old;
                return [...old, newMessage];
              }
            );
            
            // Invalidar queries relacionadas
            queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
            queryClient.invalidateQueries({ 
              queryKey: ["conversations"],
              refetchType: 'none'
            });
            queryClient.invalidateQueries({ queryKey: ["lastMessages"] });
          }
        )
        .subscribe((status) => {
          console.log(`🔗 Canal ${conversationId} status:`, status);

          if (status === "SUBSCRIBED") {
            logToSystem(
              `Canal subscribed: chat:${conversationId}`,
              "info",
              { conversationId }
            );
          }

          // Reconexão automática em caso de erro
          if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED"
          ) {
            logToSystem(
              `Canal error/timeout/closed: ${status}`,
              "warn",
              { conversationId, status }
            );

            // Tentar reconectar após 1 segundo
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
            }

            reconnectTimeoutRef.current = setTimeout(() => {
              console.log("🔄 Tentando reconectar canal...");
              channel.unsubscribe();
              setupChannel();

              // Refetch manual após reconexão
              queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
              queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
            }, 1000);
          }
        });

      return channel;
    };

    const channel = setupChannel();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      channel.unsubscribe();
      logToSystem(
        `Canal unsubscribed: chat:${conversationId}`,
        "debug",
        { conversationId }
      );
    };
  }, [conversationId, queryClient, userRole]);

  return { lastEventTimeRef };
};

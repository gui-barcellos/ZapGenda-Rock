import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Hybrid Approach: Polling agressivo + Realtime simultâneo
 * Polling roda a cada 1 segundo garantindo latência máxima de ~2.5-3s
 * React Query deduplica automaticamente requests redundantes
 */
export const useMessageFallback = (
  conversationId: string | null,
  lastEventTimeRef: React.MutableRefObject<number>
) => {
  const queryClient = useQueryClient();
  const { userRole } = useAuth();
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastInvalidationRef = useRef<number>(Date.now());

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
        source: "useMessageFallback",
        message,
        metadata,
      });
    } catch (err) {
      console.error("Failed to log to system_logs:", err);
    }
  };

  useEffect(() => {
    if (!conversationId || conversationId === "") return;

    // Polling agressivo a cada 1 segundo - React Query deduplica automaticamente
    pollIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const timeSinceLastRealtimeEvent = now - lastEventTimeRef.current;

      logToSystem(
        `Aggressive polling invalidation for conversation ${conversationId}`,
        "debug",
        { 
          conversationId, 
          timeSinceLastRealtimeEventMs: timeSinceLastRealtimeEvent
        }
      );

      // Invalidar mensagens desta conversa - sempre, sem debounce
      queryClient.invalidateQueries({ 
        queryKey: ["messages", conversationId],
        refetchType: 'active'
      });

      // Invalidar lista de conversas para capturar novas conversas criadas
      queryClient.invalidateQueries({ 
        queryKey: ["conversations"],
        refetchType: 'active'
      });

      lastInvalidationRef.current = now;
    }, 1000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [conversationId, lastEventTimeRef, queryClient, userRole]);
};

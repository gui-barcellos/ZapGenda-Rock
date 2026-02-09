import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useUrgentAlert = (selectedConversationId: string | null) => {
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Buscar conversas urgentes não abertas
  const { data: urgentConversations } = useQuery({
    queryKey: ["urgent-conversations", selectedConversationId],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) return [];

      const { data: conversations } = await supabase
        .from("conversations")
        .select(`
          id,
          contact_id,
          contacts!inner(tags)
        `)
        .eq("company_id", profile.company_id)
        .eq("status", "human")
        .neq("id", selectedConversationId || "");

      // Incluir conversas com tag "Urgente" OU "Aguardando Humano"
      return conversations?.filter(conv => {
        const tags = conv.contacts?.tags || [];
        return tags.includes("Urgente") || tags.includes("Aguardando Humano");
      }) || [];
    },
    refetchInterval: 30000, // Atualiza a cada 30s
  });

  useEffect(() => {
    if (!audioRef.current) {
      // Som de alerta simples usando Web Audio API
      audioRef.current = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuFzvLZiTYIG2m98OScTgwOUKXh8LdjHAU8ktjyz3opBSd6yPDckEAKE3y.........");
    }

    const hasUrgent = urgentConversations && urgentConversations.length > 0;

    if (hasUrgent && !isMuted) {
      // Tocar imediatamente
      audioRef.current?.play().catch(console.error);
      
      // Configurar intervalo de 60 segundos
      intervalRef.current = setInterval(() => {
        audioRef.current?.play().catch(console.error);
      }, 60000); // 60 segundos
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [urgentConversations, isMuted, selectedConversationId]);

  const muteAlert = () => setIsMuted(true);
  const unmuteAlert = () => setIsMuted(false);

  return {
    hasUrgentConversations: urgentConversations && urgentConversations.length > 0,
    urgentCount: urgentConversations?.length || 0,
    isMuted,
    muteAlert,
    unmuteAlert,
  };
};

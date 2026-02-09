import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface LastMessage {
  conversation_id: string;
  content: string;
  created_at: string;
}

export const useLastMessages = (conversationIds: string[]) => {
  return useQuery({
    queryKey: ["lastMessages", conversationIds],
    queryFn: async () => {
      if (!conversationIds.length) return {};
      
      try {
        const { data, error } = await supabase
          .from("whatsapp_messages")
          .select("conversation_id, content, created_at")
          .in("conversation_id", conversationIds)
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        
        // Agrupar por conversation_id e pegar apenas a primeira (mais recente)
        const grouped: Record<string, LastMessage> = {};
        
        (data as LastMessage[])?.forEach((msg) => {
          if (!grouped[msg.conversation_id]) {
            grouped[msg.conversation_id] = msg;
          }
        });
        
        return grouped;
      } catch (error) {
        console.error("Error fetching last messages:", error);
        return {};
      }
    },
    enabled: conversationIds.length > 0,
    staleTime: 5000, // Considera dados frescos por 5 segundos
    refetchInterval: 10000, // Refetch automático a cada 10 segundos
  });
};

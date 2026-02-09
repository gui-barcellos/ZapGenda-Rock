import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

export const useAIChat = () => {
  return useMutation({
    mutationFn: async ({
      message,
      companyId,
      contactId,
      conversationId,
    }: {
      message: string; // Single message instead of array
      companyId: string;
      contactId: string;
      conversationId?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("chat-ai", {
        body: { message, companyId, contactId, conversationId },
      });

      if (error) throw error;
      return data;
    },
    onError: (error: Error) => {
      if (error.message.includes("Token limit exceeded")) {
        toast.error("Limite de tokens da IA excedido. Por favor, contate o administrador.");
      } else {
        toast.error(`Erro ao chamar IA: ${error.message}`);
      }
    },
  });
};

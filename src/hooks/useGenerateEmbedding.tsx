import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GenerateEmbeddingParams {
  text: string;
}

interface GenerateEmbeddingResponse {
  embedding: number[];
}

export const useGenerateEmbedding = () => {
  return useMutation({
    mutationFn: async ({ text }: GenerateEmbeddingParams) => {
      const { data, error } = await supabase.functions.invoke<GenerateEmbeddingResponse>(
        "generate-embedding",
        {
          body: { text },
        }
      );

      if (error) throw error;
      if (!data?.embedding) throw new Error("No embedding returned");

      return data.embedding;
    },
    onError: (error: Error) => {
      if (error.message.includes("Rate limit")) {
        toast.error("Limite de taxa excedido. Tente novamente mais tarde.");
      } else if (error.message.includes("Payment required")) {
        toast.error("Créditos insuficientes. Adicione créditos ao workspace Lovable.");
      } else {
        toast.error(`Erro ao gerar embedding: ${error.message}`);
      }
    },
  });
};

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  summary: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CreateFAQParams {
  question: string;
  answer: string;
}

interface UpdateFAQParams {
  id: string;
  question: string;
  answer: string;
}

// Função para normalizar embedding (L2 normalization)
function normalizeEmbedding(embedding: number[]): number[] {
  const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (norm === 0) return embedding;
  return embedding.map(val => val / norm);
}

export const useCompanyFaqs = (companyId: string | null) => {
  const queryClient = useQueryClient();

  const faqs = useQuery({
    queryKey: ["company-faqs", companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from("company_faqs")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as FAQ[];
    },
    enabled: !!companyId,
  });

  const createFaq = useMutation({
    mutationFn: async (params: CreateFAQParams) => {
      if (!companyId) throw new Error("Company ID não fornecido");

      // Generate summary using AI (GPT-5-nano)
      let summary = "";
      try {
        const summaryResponse = await supabase.functions.invoke("generate-faq-summary", {
          body: { question: params.question, answer: params.answer },
        });
        summary = summaryResponse.data?.summary || "";
      } catch (error) {
        console.error("Failed to generate summary:", error);
      }

      // Insert FAQ
      const { data, error } = await supabase
        .from("company_faqs")
        .insert({
          company_id: companyId,
          question: params.question,
          answer: params.answer,
          summary,
        })
        .select()
        .single();

      if (error) throw error;

      // Gerar e salvar embedding NORMALIZADO
      if (summary || params.question) {
        try {
          const textToEmbed = summary || `${params.question} ${params.answer}`;
          const embeddingResponse = await supabase.functions.invoke("generate-embedding", {
            body: {
              text: textToEmbed,
              return_embedding: true,
            },
          });

          if (embeddingResponse.data?.embedding) {
            // Normalizar embedding antes de salvar
            const normalizedEmbedding = normalizeEmbedding(embeddingResponse.data.embedding);
            
            // Atualizar FAQ com embedding normalizado
            await supabase
              .from("company_faqs")
              .update({ embedding: JSON.stringify(normalizedEmbedding) })
              .eq("id", data.id);
            console.log("✅ Embedding normalizado salvo na FAQ:", data.id);
          }
        } catch (embError) {
          console.error("Failed to generate/save embedding:", embError);
          // Continuar mesmo se embedding falhar
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-faqs", companyId] });
      toast.success("Pergunta adicionada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar pergunta: ${error.message}`);
    },
  });

  const updateFaq = useMutation({
    mutationFn: async (params: UpdateFAQParams) => {
      if (!companyId) throw new Error("Company ID não fornecido");

      // Generate new summary
      let summary = "";
      try {
        const summaryResponse = await supabase.functions.invoke("generate-faq-summary", {
          body: { question: params.question, answer: params.answer },
        });
        summary = summaryResponse.data?.summary || "";
      } catch (error) {
        console.error("Failed to generate summary:", error);
      }

      const { data, error } = await supabase
        .from("company_faqs")
        .update({
          question: params.question,
          answer: params.answer,
          summary,
        })
        .eq("id", params.id)
        .select()
        .single();

      if (error) throw error;

      // Atualizar embedding NORMALIZADO
      if (summary || params.question) {
        try {
          const textToEmbed = summary || `${params.question} ${params.answer}`;
          const embeddingResponse = await supabase.functions.invoke("generate-embedding", {
            body: {
              text: textToEmbed,
              return_embedding: true,
            },
          });

          if (embeddingResponse.data?.embedding) {
            // Normalizar embedding antes de salvar
            const normalizedEmbedding = normalizeEmbedding(embeddingResponse.data.embedding);
            
            await supabase
              .from("company_faqs")
              .update({ embedding: JSON.stringify(normalizedEmbedding) })
              .eq("id", data.id);
            console.log("✅ Embedding normalizado atualizado na FAQ:", data.id);
          }
        } catch (embError) {
          console.error("Failed to update embedding:", embError);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-faqs", companyId] });
      toast.success("Pergunta atualizada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar pergunta: ${error.message}`);
    },
  });

  const deleteFaq = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("company_faqs")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-faqs", companyId] });
      toast.success("Pergunta removida com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover pergunta: ${error.message}`);
    },
  });

  return {
    faqs: faqs.data || [],
    isLoading: faqs.isLoading,
    createFaq,
    updateFaq,
    deleteFaq,
  };
};

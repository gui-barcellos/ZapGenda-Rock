-- FASE 5: Adicionar coluna embedding na tabela company_faqs para busca semântica

-- Criar extensão vector se não existir
CREATE EXTENSION IF NOT EXISTS vector;

-- Adicionar coluna embedding
ALTER TABLE public.company_faqs 
ADD COLUMN IF NOT EXISTS embedding VECTOR(1536);

-- Criar índice para busca vetorial eficiente
CREATE INDEX IF NOT EXISTS idx_company_faqs_embedding 
ON public.company_faqs 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Criar função RPC para busca semântica de FAQs
CREATE OR REPLACE FUNCTION public.search_similar_faqs(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.70,
  match_count INT DEFAULT 3,
  p_company_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  question TEXT,
  answer TEXT,
  summary TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.question,
    f.answer,
    f.summary,
    1 - (f.embedding <=> query_embedding) AS similarity
  FROM company_faqs f
  WHERE 
    f.is_active = true
    AND f.embedding IS NOT NULL
    AND (p_company_id IS NULL OR f.company_id = p_company_id)
    AND 1 - (f.embedding <=> query_embedding) > match_threshold
  ORDER BY f.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Criar trigger para atualizar embedding automaticamente quando FAQ é criado/atualizado
-- (Nota: o embedding será gerado pela edge function generate-embedding)

COMMENT ON COLUMN public.company_faqs.embedding IS 'Embedding vetorial 1536d para busca semântica usando text-embedding-3-small';
COMMENT ON FUNCTION public.search_similar_faqs IS 'Busca FAQs similares usando busca vetorial com threshold de similaridade';
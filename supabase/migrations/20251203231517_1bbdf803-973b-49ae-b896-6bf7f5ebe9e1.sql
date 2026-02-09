-- Ajustar dimensão do embedding de 768 para 1536 (text-embedding-3-small gera 1536)
-- Primeiro, deletar embeddings existentes (serão regenerados com nova dimensão)
DELETE FROM public.mpm_embeddings;

-- Alterar a coluna embedding para VECTOR(1536)
ALTER TABLE public.mpm_embeddings 
ALTER COLUMN embedding TYPE vector(1536);

-- Recriar índice para busca vetorial eficiente
DROP INDEX IF EXISTS idx_mpm_embeddings_embedding;
CREATE INDEX idx_mpm_embeddings_embedding ON public.mpm_embeddings 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Criar ou substituir função de busca por similaridade
CREATE OR REPLACE FUNCTION search_similar_events(
  query_embedding text,
  match_company_id uuid,
  match_contact_id uuid DEFAULT NULL,
  similarity_threshold float DEFAULT 0.80,
  match_count int DEFAULT 3
)
RETURNS TABLE (
  event_id uuid,
  event_type text,
  event_content text,
  sent_at timestamptz,
  similarity float,
  metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id as event_id,
    e.event_type,
    e.event_content,
    e.sent_at,
    1 - (emb.embedding <=> query_embedding::vector) as similarity,
    e.metadata
  FROM mpm_embeddings emb
  INNER JOIN mpm_events e ON e.id = emb.event_id
  WHERE e.company_id = match_company_id
    AND (match_contact_id IS NULL OR e.contact_id = match_contact_id)
    AND 1 - (emb.embedding <=> query_embedding::vector) > similarity_threshold
  ORDER BY emb.embedding <=> query_embedding::vector
  LIMIT match_count;
END;
$$;
-- Função SQL para busca vetorial otimizada
CREATE OR REPLACE FUNCTION public.search_similar_events(
  query_embedding vector(768),
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
    e.id AS event_id,
    e.event_type,
    e.event_content,
    e.sent_at,
    1 - (emb.embedding <=> query_embedding) AS similarity,
    e.metadata
  FROM public.mpm_embeddings emb
  INNER JOIN public.mpm_events e ON e.id = emb.event_id
  WHERE 
    e.company_id = match_company_id
    AND (match_contact_id IS NULL OR e.contact_id = match_contact_id)
    AND (1 - (emb.embedding <=> query_embedding)) > similarity_threshold
  ORDER BY emb.embedding <=> query_embedding ASC
  LIMIT match_count;
END;
$$;
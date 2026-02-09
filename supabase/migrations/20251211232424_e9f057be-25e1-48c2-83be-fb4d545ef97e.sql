-- Criar função de updated_at se não existir
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Tabela de memórias ativas por contato
CREATE TABLE public.contact_memories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  memory_type TEXT NOT NULL DEFAULT 'general',
  importance INTEGER NOT NULL DEFAULT 3 CHECK (importance >= 1 AND importance <= 5),
  embedding vector(1536),
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_contact_memories_contact ON public.contact_memories(contact_id);
CREATE INDEX idx_contact_memories_company ON public.contact_memories(company_id);
CREATE INDEX idx_contact_memories_type ON public.contact_memories(memory_type);
CREATE INDEX idx_contact_memories_embedding ON public.contact_memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Enable RLS
ALTER TABLE public.contact_memories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Company contact_memories"
ON public.contact_memories
FOR ALL
TO authenticated
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Superuser contact_memories"
ON public.contact_memories
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'superuser'::app_role))
WITH CHECK (has_role(auth.uid(), 'superuser'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_contact_memories_updated_at
BEFORE UPDATE ON public.contact_memories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função de busca semântica para memórias
CREATE OR REPLACE FUNCTION public.search_contact_memories(
  query_embedding vector,
  match_contact_id uuid,
  match_threshold double precision DEFAULT 0.70,
  match_count integer DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  content text,
  memory_type text,
  importance integer,
  similarity double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cm.id,
    cm.content,
    cm.memory_type,
    cm.importance,
    1 - (cm.embedding <=> query_embedding) AS similarity
  FROM contact_memories cm
  WHERE 
    cm.contact_id = match_contact_id
    AND cm.embedding IS NOT NULL
    AND 1 - (cm.embedding <=> query_embedding) > match_threshold
  ORDER BY cm.importance DESC, cm.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
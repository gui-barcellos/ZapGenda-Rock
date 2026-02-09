-- Ativar extensão pgvector se ainda não estiver ativa
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabela 1: mpm_events (eventos automáticos do sistema)
CREATE TABLE IF NOT EXISTS public.mpm_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  contact_id UUID,
  conversation_id UUID,
  event_type TEXT NOT NULL,
  event_content TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para mpm_events
CREATE INDEX IF NOT EXISTS idx_mpm_events_company_contact ON public.mpm_events(company_id, contact_id);
CREATE INDEX IF NOT EXISTS idx_mpm_events_conversation ON public.mpm_events(conversation_id);
CREATE INDEX IF NOT EXISTS idx_mpm_events_type ON public.mpm_events(event_type);

-- RLS para mpm_events
ALTER TABLE public.mpm_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company mpm_events" ON public.mpm_events
  FOR ALL
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Superuser mpm_events" ON public.mpm_events
  FOR ALL
  USING (has_role(auth.uid(), 'superuser'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superuser'::app_role));

-- Tabela 2: mpm_embeddings (embeddings dos eventos)
CREATE TABLE IF NOT EXISTS public.mpm_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.mpm_events(id) ON DELETE CASCADE,
  embedding vector(768) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice HNSW para busca vetorial eficiente
CREATE INDEX IF NOT EXISTS idx_mpm_embeddings_vector ON public.mpm_embeddings 
  USING hnsw (embedding vector_cosine_ops);

-- Índice para event_id
CREATE INDEX IF NOT EXISTS idx_mpm_embeddings_event ON public.mpm_embeddings(event_id);

-- RLS para mpm_embeddings
ALTER TABLE public.mpm_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company mpm_embeddings" ON public.mpm_embeddings
  FOR ALL
  USING (event_id IN (SELECT id FROM mpm_events WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())))
  WITH CHECK (event_id IN (SELECT id FROM mpm_events WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Superuser mpm_embeddings" ON public.mpm_embeddings
  FOR ALL
  USING (has_role(auth.uid(), 'superuser'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superuser'::app_role));

-- Tabela 3: mpm_chatLogs (logs mínimos de conversas com IA)
CREATE TABLE IF NOT EXISTS public.mpm_chatLogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  contact_id UUID,
  conversation_id UUID,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  context_used JSONB,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para mpm_chatLogs
CREATE INDEX IF NOT EXISTS idx_mpm_chatlogs_company_contact ON public.mpm_chatLogs(company_id, contact_id);
CREATE INDEX IF NOT EXISTS idx_mpm_chatlogs_conversation ON public.mpm_chatLogs(conversation_id);
CREATE INDEX IF NOT EXISTS idx_mpm_chatlogs_created ON public.mpm_chatLogs(created_at DESC);

-- RLS para mpm_chatLogs
ALTER TABLE public.mpm_chatLogs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company mpm_chatLogs" ON public.mpm_chatLogs
  FOR ALL
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Superuser mpm_chatLogs" ON public.mpm_chatLogs
  FOR ALL
  USING (has_role(auth.uid(), 'superuser'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superuser'::app_role));
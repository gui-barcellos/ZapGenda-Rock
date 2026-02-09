-- =====================================================
-- FASE 1: Tabelas para OpenAI Assistants API
-- =====================================================

-- 1.1 Tabela global do Assistant (1 único para todo o sistema)
CREATE TABLE public.openai_assistant (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assistant_id TEXT NOT NULL,
  name TEXT DEFAULT 'Assistente Virtual',
  model TEXT DEFAULT 'gpt-4o-mini',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Apenas 1 registro deve existir
CREATE UNIQUE INDEX idx_openai_assistant_single ON public.openai_assistant ((true));

-- RLS: Apenas superuser pode gerenciar
ALTER TABLE public.openai_assistant ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superuser openai_assistant"
ON public.openai_assistant
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'superuser'::app_role))
WITH CHECK (has_role(auth.uid(), 'superuser'::app_role));

-- 1.2 Tabela de Threads (1 thread por conversa)
CREATE TABLE public.assistant_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE UNIQUE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  thread_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_assistant_threads_company ON public.assistant_threads(company_id);
CREATE INDEX idx_assistant_threads_thread ON public.assistant_threads(thread_id);

-- RLS
ALTER TABLE public.assistant_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company assistant_threads"
ON public.assistant_threads
FOR ALL
TO authenticated
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Superuser assistant_threads"
ON public.assistant_threads
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'superuser'::app_role))
WITH CHECK (has_role(auth.uid(), 'superuser'::app_role));

-- 1.3 Adicionar campo de sincronização no ai_master_prompt
ALTER TABLE public.ai_master_prompt 
ADD COLUMN IF NOT EXISTS assistant_synced_at TIMESTAMPTZ;
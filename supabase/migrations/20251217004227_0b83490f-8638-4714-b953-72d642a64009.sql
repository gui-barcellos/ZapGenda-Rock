-- Remove tabela assistant_threads (não mais necessária com Responses API)
DROP TABLE IF EXISTS public.assistant_threads;

-- Remove colunas de sync do ai_master_prompt (não mais necessárias)
ALTER TABLE public.ai_master_prompt 
  DROP COLUMN IF EXISTS assistant_synced_at,
  DROP COLUMN IF EXISTS last_pulled_at;

-- Adicionar context_window se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_master_prompt' AND column_name = 'context_window') THEN
    ALTER TABLE public.ai_master_prompt ADD COLUMN context_window integer DEFAULT 20;
  END IF;
END $$;
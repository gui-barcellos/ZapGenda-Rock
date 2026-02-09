-- Drop legacy memory tables (no longer needed - memory managed by OpenAI Threads)
DROP TABLE IF EXISTS public.mpm_embeddings CASCADE;
DROP TABLE IF EXISTS public.mpm_events CASCADE;
DROP TABLE IF EXISTS public.mpm_chatlogs CASCADE;
DROP TABLE IF EXISTS public.contact_memories CASCADE;

-- Add last_pulled_at column for bidirectional sync with OpenAI Platform
ALTER TABLE public.ai_master_prompt 
ADD COLUMN IF NOT EXISTS last_pulled_at TIMESTAMPTZ;
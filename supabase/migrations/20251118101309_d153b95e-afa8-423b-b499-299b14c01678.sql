-- Create ai_prompt_logs table for debugging AI prompts
CREATE TABLE IF NOT EXISTS public.ai_prompt_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  full_prompt TEXT NOT NULL,
  ai_config_snapshot JSONB,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_prompt_logs_company ON public.ai_prompt_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_logs_created ON public.ai_prompt_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.ai_prompt_logs ENABLE ROW LEVEL SECURITY;

-- Policy for superuser only
CREATE POLICY "Superuser ai_prompt_logs"
  ON public.ai_prompt_logs
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'superuser'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superuser'::app_role));
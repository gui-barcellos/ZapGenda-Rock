-- Add AI token limits and usage to company_subscriptions
ALTER TABLE public.company_subscriptions
ADD COLUMN IF NOT EXISTS max_ai_tokens BIGINT DEFAULT 5000000,
ADD COLUMN IF NOT EXISTS current_ai_tokens BIGINT DEFAULT 0;

-- Add AI tokens resource to resource_prices
INSERT INTO public.resource_prices (resource_type, monthly_price, updated_at)
VALUES ('ai_tokens_5m', 50.00, now())
ON CONFLICT (resource_type) DO NOTHING;

-- Create audio_transcription_usage table
CREATE TABLE IF NOT EXISTS public.audio_transcription_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id),
  contact_id UUID,
  conversation_id UUID,
  audio_duration_seconds INTEGER NOT NULL,
  transcription_text TEXT,
  whisper_model TEXT DEFAULT 'whisper-1',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on audio_transcription_usage
ALTER TABLE public.audio_transcription_usage ENABLE ROW LEVEL SECURITY;

-- RLS policies for audio_transcription_usage
CREATE POLICY "Company audio transcription access"
ON public.audio_transcription_usage
FOR ALL
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
)
WITH CHECK (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Superuser audio transcription access"
ON public.audio_transcription_usage
FOR ALL
USING (has_role(auth.uid(), 'superuser'::app_role))
WITH CHECK (has_role(auth.uid(), 'superuser'::app_role));

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_audio_transcription_company ON public.audio_transcription_usage(company_id);
CREATE INDEX IF NOT EXISTS idx_audio_transcription_created ON public.audio_transcription_usage(created_at);
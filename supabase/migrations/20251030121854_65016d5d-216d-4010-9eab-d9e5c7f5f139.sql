-- Create AI token usage tracking table
CREATE TABLE public.ai_token_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  tokens_used integer NOT NULL DEFAULT 0,
  model_used text NOT NULL,
  operation_type text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_token_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policy for superuser access
CREATE POLICY "Superuser tokens access"
ON public.ai_token_usage
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'superuser'::app_role))
WITH CHECK (has_role(auth.uid(), 'superuser'::app_role));

-- Indexes for performance
CREATE INDEX idx_ai_token_usage_company ON ai_token_usage(company_id);
CREATE INDEX idx_ai_token_usage_created ON ai_token_usage(created_at);
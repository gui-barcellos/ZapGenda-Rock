-- Create token_reset_history table
CREATE TABLE public.token_reset_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  companies_affected INTEGER NOT NULL,
  total_tokens_reset BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.token_reset_history ENABLE ROW LEVEL SECURITY;

-- Create policy for SuperUser to view history
CREATE POLICY "Superuser can view token reset history"
ON public.token_reset_history
FOR SELECT
USING (has_role(auth.uid(), 'superuser'::app_role));

-- Create policy for system to insert (no user context needed)
CREATE POLICY "System can insert token reset history"
ON public.token_reset_history
FOR INSERT
WITH CHECK (true);
-- Create resend_settings table
CREATE TABLE IF NOT EXISTS public.resend_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key TEXT NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.resend_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only superusers can manage Resend settings
CREATE POLICY "Superuser resend_settings"
  ON public.resend_settings
  FOR ALL
  USING (has_role(auth.uid(), 'superuser'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superuser'::app_role));

-- Index for performance
CREATE INDEX idx_resend_settings_updated_at ON public.resend_settings(updated_at DESC);

-- Function to get masked Resend API key
CREATE OR REPLACE FUNCTION public.get_masked_resend_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  full_key TEXT;
BEGIN
  -- Check if user is superuser
  IF NOT has_role(auth.uid(), 'superuser'::app_role) THEN
    RETURN NULL;
  END IF;
  
  -- Get most recent key
  SELECT api_key INTO full_key 
  FROM resend_settings 
  ORDER BY updated_at DESC 
  LIMIT 1;
  
  IF full_key IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Return masked key (re_...last4chars)
  RETURN 're_...' || RIGHT(full_key, 4);
END;
$$;
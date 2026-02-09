-- Create table for OpenAI settings
CREATE TABLE public.openai_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.openai_settings ENABLE ROW LEVEL SECURITY;

-- Only superusers can manage OpenAI settings
CREATE POLICY "Superuser openai_settings"
  ON public.openai_settings
  FOR ALL
  USING (has_role(auth.uid(), 'superuser'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superuser'::app_role));

-- Function to get masked API key
CREATE OR REPLACE FUNCTION public.get_masked_api_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  full_key TEXT;
BEGIN
  -- Check if user is superuser
  IF NOT has_role(auth.uid(), 'superuser'::app_role) THEN
    RETURN NULL;
  END IF;
  
  SELECT api_key INTO full_key FROM openai_settings ORDER BY updated_at DESC LIMIT 1;
  
  IF full_key IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Return masked key (sk-...last4chars)
  RETURN 'sk-...' || RIGHT(full_key, 4);
END;
$$;
-- Create supabase_settings table
CREATE TABLE IF NOT EXISTS public.supabase_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  project_url TEXT NOT NULL,
  publishable_key TEXT NOT NULL,
  access_token TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.supabase_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only superusers can manage Supabase settings
CREATE POLICY "Superuser supabase_settings"
  ON public.supabase_settings
  FOR ALL
  USING (has_role(auth.uid(), 'superuser'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superuser'::app_role));

-- Index for performance
CREATE INDEX idx_supabase_settings_updated_at ON public.supabase_settings(updated_at DESC);

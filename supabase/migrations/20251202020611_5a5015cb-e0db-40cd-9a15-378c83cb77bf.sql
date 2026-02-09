-- Add new fields to company_settings for payment, phone, and social media
ALTER TABLE company_settings 
ADD COLUMN IF NOT EXISTS payment_methods text,
ADD COLUMN IF NOT EXISTS alternative_phone text,
ADD COLUMN IF NOT EXISTS social_media jsonb DEFAULT '{}';

-- Create company_faqs table for FAQ management
CREATE TABLE IF NOT EXISTS company_faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  summary text,  -- AI-generated keywords for search (~10 words)
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Index for fast company lookup
CREATE INDEX IF NOT EXISTS idx_company_faqs_company_id ON company_faqs(company_id);
CREATE INDEX IF NOT EXISTS idx_company_faqs_active ON company_faqs(company_id, is_active);

-- RLS policies for company_faqs
ALTER TABLE company_faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company faqs" ON company_faqs
FOR ALL TO authenticated
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Trigger to update updated_at on company_faqs
CREATE OR REPLACE FUNCTION update_company_faqs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_company_faqs_updated_at_trigger
BEFORE UPDATE ON company_faqs
FOR EACH ROW
EXECUTE FUNCTION update_company_faqs_updated_at();
-- Add email field to company_settings
ALTER TABLE company_settings 
ADD COLUMN IF NOT EXISTS email text;
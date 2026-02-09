ALTER TABLE company_ai_settings 
ADD COLUMN IF NOT EXISTS greeting_time_based BOOLEAN DEFAULT false;
-- Add tracking columns to appointments for automated messages
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS pre_reminder_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS post_attended_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS post_missed_sent_at TIMESTAMP WITH TIME ZONE;

-- Add configuration columns to company_settings for automated messages
ALTER TABLE company_settings 
ADD COLUMN IF NOT EXISTS pre_appointment_hours INTEGER DEFAULT 24,
ADD COLUMN IF NOT EXISTS scheduled_return_reminder_days INTEGER DEFAULT 7;

-- Create table for birthday messages log (prevent duplicates)
CREATE TABLE IF NOT EXISTS birthday_messages_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  year INTEGER NOT NULL,
  UNIQUE(contact_id, company_id, year)
);

-- Enable RLS on birthday_messages_log
ALTER TABLE birthday_messages_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for birthday_messages_log
CREATE POLICY "Company birthday_messages_log" ON birthday_messages_log
  FOR ALL
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Index for efficient queries on appointments tracking
CREATE INDEX IF NOT EXISTS idx_appointments_reminders ON appointments(company_id, date, status, pre_reminder_sent_at);
CREATE INDEX IF NOT EXISTS idx_appointments_followup ON appointments(company_id, status, updated_at, post_attended_sent_at, post_missed_sent_at);

-- Index for birthday queries
CREATE INDEX IF NOT EXISTS idx_contacts_birthday ON contacts(company_id, birth_date) WHERE birth_date IS NOT NULL;
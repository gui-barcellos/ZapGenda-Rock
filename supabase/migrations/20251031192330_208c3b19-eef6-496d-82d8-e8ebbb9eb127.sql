-- ============================================
-- OTIMIZAÇÕES PARA ESCALAR ATÉ 500 CLIENTES
-- ============================================

-- ==========================================
-- 1. DATABASE INDEXES (CRÍTICO)
-- ==========================================

-- Appointments (tabela mais crítica - múltiplas queries por usuário)
CREATE INDEX IF NOT EXISTS idx_appointments_company_date 
  ON appointments(company_id, date);

CREATE INDEX IF NOT EXISTS idx_appointments_professional_date 
  ON appointments(professional_id, date);

CREATE INDEX IF NOT EXISTS idx_appointments_contact 
  ON appointments(contact_id);

CREATE INDEX IF NOT EXISTS idx_appointments_status 
  ON appointments(status) WHERE status != 'cancelled';

-- Blocked Slots (consultada em toda criação de appointment)
CREATE INDEX IF NOT EXISTS idx_blocked_slots_professional_date 
  ON blocked_slots(professional_id, date);

CREATE INDEX IF NOT EXISTS idx_blocked_slots_company_date 
  ON blocked_slots(company_id, date) WHERE professional_id IS NULL;

-- Availability (consultada frequentemente)
CREATE INDEX IF NOT EXISTS idx_availability_professional_day 
  ON availability(professional_id, day_of_week, is_active);

CREATE INDEX IF NOT EXISTS idx_service_availability_service_day 
  ON service_availability(service_id, day_of_week, is_active);

-- Contacts (busca por nome e telefone)
CREATE INDEX IF NOT EXISTS idx_contacts_company_name 
  ON contacts(company_id, name);

CREATE INDEX IF NOT EXISTS idx_contacts_phone 
  ON contacts(phone);

CREATE INDEX IF NOT EXISTS idx_contacts_tags 
  ON contacts USING gin(tags);

-- WhatsApp (volume alto de mensagens)
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation 
  ON whatsapp_messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_company_created 
  ON whatsapp_messages(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_company_status 
  ON conversations(company_id, status, last_message_at DESC);

-- ==========================================
-- 2. FEATURE FLAGS (GOOD TO HAVE)
-- ==========================================

CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, feature_name)
);

-- Index para busca rápida
CREATE INDEX IF NOT EXISTS idx_feature_flags_company_feature 
  ON feature_flags(company_id, feature_name);

-- RLS policies
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company feature_flags" ON feature_flags
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Superuser feature_flags" ON feature_flags
  FOR ALL USING (has_role(auth.uid(), 'superuser'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superuser'::app_role));

-- ==========================================
-- 3. PREFERRED LANGUAGE (GOOD TO HAVE)
-- ==========================================

-- Adicionar coluna em profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'pt';

-- Adicionar coluna em companies (idioma padrão da empresa)
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS default_language TEXT DEFAULT 'pt';

-- Adicionar check constraint para valores válidos
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'valid_language_profile'
  ) THEN
    ALTER TABLE profiles
    ADD CONSTRAINT valid_language_profile 
    CHECK (preferred_language IN ('pt', 'en', 'es'));
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'valid_language_company'
  ) THEN
    ALTER TABLE companies
    ADD CONSTRAINT valid_language_company 
    CHECK (default_language IN ('pt', 'en', 'es'));
  END IF;
END $$;
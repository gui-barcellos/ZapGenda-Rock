-- Add affiliate role
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'affiliate';

-- ZapGenda: affiliates, audit logs, and messaging fields

-- Company settings additions
ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'pt-BR',
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Sao_Paulo',
ADD COLUMN IF NOT EXISTS confirmation_hours INTEGER DEFAULT 72 CHECK (confirmation_hours > 0),
ADD COLUMN IF NOT EXISTS reminder_hours INTEGER DEFAULT 24 CHECK (reminder_hours > 0);

-- Appointment reminder tracking
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

-- Migrate legacy reminder marker if present
UPDATE appointments
SET reminder_sent_at = pre_reminder_sent_at
WHERE reminder_sent_at IS NULL AND pre_reminder_sent_at IS NOT NULL;

-- Index for reminder queries
CREATE INDEX IF NOT EXISTS idx_appointments_reminder_sent
  ON appointments(company_id, date, status, reminder_sent_at);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES auth.users(id),
  actor_type TEXT NOT NULL DEFAULT 'user',
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  payload_before JSONB,
  payload_after JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company audit_logs" ON audit_logs
FOR ALL TO authenticated
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Affiliates
CREATE TABLE IF NOT EXISTS affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status TEXT DEFAULT 'active',
  commission_months INTEGER DEFAULT 12 CHECK (commission_months > 0),
  commission_rate NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS affiliate_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active',
  commission_start_at TIMESTAMPTZ DEFAULT NOW(),
  commission_end_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(affiliate_id, company_id)
);

CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id),
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'BRL',
  status TEXT DEFAULT 'pending',
  period_start DATE,
  period_end DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'BRL',
  status TEXT DEFAULT 'pending',
  stripe_payout_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS affiliates_stripe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE,
  stripe_account_id TEXT,
  charges_enabled BOOLEAN DEFAULT false,
  payouts_enabled BOOLEAN DEFAULT false,
  onboarding_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliates_stripe ENABLE ROW LEVEL SECURITY;

-- Superuser full access policies
CREATE POLICY "Superuser affiliates" ON affiliates
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'superuser'))
WITH CHECK (has_role(auth.uid(), 'superuser'));

CREATE POLICY "Superuser affiliate_companies" ON affiliate_companies
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'superuser'))
WITH CHECK (has_role(auth.uid(), 'superuser'));

CREATE POLICY "Superuser affiliate_commissions" ON affiliate_commissions
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'superuser'))
WITH CHECK (has_role(auth.uid(), 'superuser'));

CREATE POLICY "Superuser affiliate_payouts" ON affiliate_payouts
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'superuser'))
WITH CHECK (has_role(auth.uid(), 'superuser'));

CREATE POLICY "Superuser affiliates_stripe" ON affiliates_stripe
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'superuser'))
WITH CHECK (has_role(auth.uid(), 'superuser'));

-- Affiliate self-access policies
CREATE POLICY "Affiliate self access" ON affiliates
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Affiliate own companies" ON affiliate_companies
FOR SELECT TO authenticated
USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));

CREATE POLICY "Affiliate own commissions" ON affiliate_commissions
FOR SELECT TO authenticated
USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));

CREATE POLICY "Affiliate own payouts" ON affiliate_payouts
FOR SELECT TO authenticated
USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));

CREATE POLICY "Affiliate own stripe" ON affiliates_stripe
FOR SELECT TO authenticated
USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));





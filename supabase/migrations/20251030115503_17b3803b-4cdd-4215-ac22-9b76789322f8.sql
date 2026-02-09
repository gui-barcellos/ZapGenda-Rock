-- ============================================
-- TIPOS ENUMERADOS
-- ============================================

CREATE TYPE app_role AS ENUM ('superuser', 'admin', 'attendant');

-- ============================================
-- EMPRESAS E MULTI-TENANCY
-- ============================================

CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'trial',
  
  owner_name TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  owner_whatsapp TEXT NOT NULL,
  
  trial_start_date DATE,
  trial_end_date DATE,
  free_days_granted INTEGER DEFAULT 0,
  payment_due_day INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT,
  must_change_password BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  UNIQUE(user_id, role, company_id)
);

-- ============================================
-- FUNÇÃO SECURITY DEFINER PARA VERIFICAR ROLES
-- (Criada DEPOIS da tabela user_roles)
-- ============================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ============================================
-- CONFIGURAÇÃO DE PLANOS
-- ============================================

CREATE TABLE plan_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE resource_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type TEXT NOT NULL UNIQUE,
  monthly_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

INSERT INTO resource_prices (resource_type, monthly_price) VALUES
  ('base_plan', 0),
  ('whatsapp', 0),
  ('professional', 0),
  ('user', 0),
  ('contacts_1k', 0);

-- ============================================
-- ASSINATURAS E LIMITES
-- ============================================

CREATE TABLE company_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  max_whatsapp_numbers INTEGER DEFAULT 1,
  max_professionals INTEGER DEFAULT 3,
  max_users INTEGER DEFAULT 2,
  max_contacts INTEGER DEFAULT 1000,
  current_whatsapp_numbers INTEGER DEFAULT 0,
  current_professionals INTEGER DEFAULT 0,
  current_users INTEGER DEFAULT 0,
  current_contacts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE subscription_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  quantity_change INTEGER NOT NULL,
  scheduled_for DATE,
  applied_at TIMESTAMPTZ,
  requested_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PAGAMENTOS (STRIPE)
-- ============================================

CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE NOT NULL,
  stripe_payment_method_id TEXT,
  card_brand TEXT,
  card_last4 TEXT,
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  is_default BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE stripe_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  status TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT UNIQUE,
  stripe_charge_id TEXT,
  amount_total DECIMAL(10,2) NOT NULL,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  status TEXT NOT NULL,
  invoice_pdf_url TEXT,
  billing_reason TEXT,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  attempt_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- WHATSAPP (MÚLTIPLOS NÚMEROS)
-- ============================================

CREATE TABLE whatsapp_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  z_api_instance_id TEXT NOT NULL,
  z_api_token TEXT NOT NULL,
  z_api_client_token TEXT NOT NULL,
  phone TEXT,
  is_connected BOOLEAN DEFAULT false,
  name TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, z_api_instance_id)
);

CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  birth_date DATE,
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, phone)
);

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  whatsapp_connection_id UUID REFERENCES whatsapp_connections(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'ai',
  assigned_to_user_id UUID REFERENCES auth.users(id),
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(whatsapp_connection_id, contact_id)
);

CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  whatsapp_connection_id UUID REFERENCES whatsapp_connections(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id),
  conversation_id UUID REFERENCES conversations(id),
  message_id TEXT,
  phone TEXT NOT NULL,
  message_type TEXT,
  content TEXT NOT NULL,
  direction TEXT NOT NULL,
  sent_by_user_id UUID REFERENCES auth.users(id),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CORE DO SISTEMA
-- ============================================

CREATE TABLE professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  specialty TEXT,
  color TEXT DEFAULT '#3b82f6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  duration INTEGER NOT NULL,
  price DECIMAL(10,2),
  color TEXT DEFAULT '#10b981',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT DEFAULT 'scheduled',
  confirmation_sent BOOLEAN DEFAULT false,
  confirmation_sent_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE scheduled_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  original_appointment_id UUID REFERENCES appointments(id),
  whatsapp_connection_id UUID REFERENCES whatsapp_connections(id),
  return_date DATE NOT NULL,
  return_months INTEGER NOT NULL,
  message_sent BOOLEAN DEFAULT false,
  message_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE auto_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, message_type)
);

CREATE TABLE company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  primary_color TEXT DEFAULT '#3b82f6',
  logo_url TEXT,
  min_advance_hours INTEGER DEFAULT 2,
  max_advance_days INTEGER DEFAULT 60,
  allow_simultaneous_bookings BOOLEAN DEFAULT false,
  send_confirmation_messages BOOLEAN DEFAULT true,
  send_birthday_messages BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(professional_id, day_of_week)
);

CREATE TABLE blocked_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- IA E SUPORTE
-- ============================================

CREATE TABLE company_ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  ai_enabled BOOLEAN DEFAULT true,
  ai_instructions TEXT,
  custom_faqs JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE support_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  subject TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'normal',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  is_ai_response BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_faqs ENABLE ROW LEVEL SECURITY;

-- SuperUser tem acesso total
CREATE POLICY "Superuser full access" ON companies FOR ALL TO authenticated USING (has_role(auth.uid(), 'superuser')) WITH CHECK (has_role(auth.uid(), 'superuser'));
CREATE POLICY "Superuser profiles" ON profiles FOR ALL TO authenticated USING (has_role(auth.uid(), 'superuser')) WITH CHECK (has_role(auth.uid(), 'superuser'));
CREATE POLICY "Superuser roles" ON user_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'superuser')) WITH CHECK (has_role(auth.uid(), 'superuser'));
CREATE POLICY "Superuser subscriptions" ON company_subscriptions FOR ALL TO authenticated USING (has_role(auth.uid(), 'superuser')) WITH CHECK (has_role(auth.uid(), 'superuser'));
CREATE POLICY "Superuser sub_changes" ON subscription_changes FOR ALL TO authenticated USING (has_role(auth.uid(), 'superuser')) WITH CHECK (has_role(auth.uid(), 'superuser'));
CREATE POLICY "Superuser payment" ON payment_methods FOR ALL TO authenticated USING (has_role(auth.uid(), 'superuser')) WITH CHECK (has_role(auth.uid(), 'superuser'));
CREATE POLICY "Superuser stripe" ON stripe_subscriptions FOR ALL TO authenticated USING (has_role(auth.uid(), 'superuser')) WITH CHECK (has_role(auth.uid(), 'superuser'));
CREATE POLICY "Superuser invoices" ON invoices FOR ALL TO authenticated USING (has_role(auth.uid(), 'superuser')) WITH CHECK (has_role(auth.uid(), 'superuser'));
CREATE POLICY "Superuser faqs" ON support_faqs FOR ALL TO authenticated USING (has_role(auth.uid(), 'superuser')) WITH CHECK (has_role(auth.uid(), 'superuser'));
CREATE POLICY "Superuser tickets" ON support_tickets FOR ALL TO authenticated USING (has_role(auth.uid(), 'superuser')) WITH CHECK (has_role(auth.uid(), 'superuser'));
CREATE POLICY "Superuser ticket_msg" ON support_ticket_messages FOR ALL TO authenticated USING (has_role(auth.uid(), 'superuser')) WITH CHECK (has_role(auth.uid(), 'superuser'));
CREATE POLICY "Superuser prices" ON resource_prices FOR ALL TO authenticated USING (has_role(auth.uid(), 'superuser')) WITH CHECK (has_role(auth.uid(), 'superuser'));

-- Usuários comuns veem apenas dados da própria empresa
CREATE POLICY "View own company" ON companies FOR SELECT TO authenticated USING (id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "View own profile" ON profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Update own profile" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "View own roles" ON user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Políticas para tabelas da empresa
CREATE POLICY "Company subscriptions" ON company_subscriptions FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Company sub_changes" ON subscription_changes FOR ALL TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())) WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Company payment" ON payment_methods FOR ALL TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())) WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Company stripe" ON stripe_subscriptions FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Company invoices" ON invoices FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Company whatsapp" ON whatsapp_connections FOR ALL TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())) WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Company contacts" ON contacts FOR ALL TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())) WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Company conversations" ON conversations FOR ALL TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())) WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Company messages" ON whatsapp_messages FOR ALL TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())) WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Company professionals" ON professionals FOR ALL TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())) WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Company services" ON services FOR ALL TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())) WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Company appointments" ON appointments FOR ALL TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())) WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Company returns" ON scheduled_returns FOR ALL TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())) WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Company auto_msg" ON auto_message_templates FOR ALL TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())) WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Company settings" ON company_settings FOR ALL TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())) WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Company availability" ON availability FOR ALL TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())) WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Company blocked" ON blocked_slots FOR ALL TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())) WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Company ai" ON company_ai_settings FOR ALL TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())) WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Company tickets" ON support_tickets FOR ALL TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())) WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Company ticket_msg" ON support_ticket_messages FOR SELECT TO authenticated USING (ticket_id IN (SELECT id FROM support_tickets WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())));

-- Todos podem ver preços e FAQs
CREATE POLICY "View prices" ON resource_prices FOR SELECT TO authenticated USING (true);
CREATE POLICY "View faqs" ON support_faqs FOR SELECT TO authenticated USING (true);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX idx_profiles_company_id ON profiles(company_id);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_company_id ON user_roles(company_id);
CREATE INDEX idx_appointments_date ON appointments(date);
CREATE INDEX idx_appointments_company_id ON appointments(company_id);
CREATE INDEX idx_appointments_professional_id ON appointments(professional_id);
CREATE INDEX idx_contacts_company_id ON contacts(company_id);
CREATE INDEX idx_contacts_phone ON contacts(phone);
CREATE INDEX idx_whatsapp_messages_company_id ON whatsapp_messages(company_id);
CREATE INDEX idx_whatsapp_messages_conversation_id ON whatsapp_messages(conversation_id);
CREATE INDEX idx_conversations_company_id ON conversations(company_id);
CREATE INDEX idx_invoices_company_id ON invoices(company_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_companies_status ON companies(status);
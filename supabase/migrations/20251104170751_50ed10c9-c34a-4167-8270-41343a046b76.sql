-- Adicionar campos para CRM na tabela contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS funnel_stage TEXT DEFAULT 'lead_novo';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS assigned_to_user_id UUID REFERENCES profiles(id);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS estimated_value NUMERIC(10,2);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_contact_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS next_follow_up DATE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS pipeline_notes TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS moved_to_stage_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS lead_source TEXT DEFAULT 'manual';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS lost_reason TEXT;

-- Criar tabela de estágios do CRM (customizáveis por empresa)
CREATE TABLE IF NOT EXISTS crm_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  order_position INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, order_position)
);

-- RLS para crm_stages
ALTER TABLE crm_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company crm_stages" ON crm_stages
FOR ALL USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
)
WITH CHECK (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);

-- Criar tabela de histórico do CRM
CREATE TABLE IF NOT EXISTS crm_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  action_type TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para crm_history
ALTER TABLE crm_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company crm_history" ON crm_history
FOR ALL USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
)
WITH CHECK (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);

-- Função para criar estágios padrão ao criar empresa
CREATE OR REPLACE FUNCTION create_default_crm_stages()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO crm_stages (company_id, name, color, order_position) VALUES
    (NEW.id, 'Lead Novo', '#3b82f6', 1),
    (NEW.id, 'Em Contato', '#8b5cf6', 2),
    (NEW.id, 'Proposta Enviada', '#f59e0b', 3),
    (NEW.id, 'Em Negociação', '#10b981', 4),
    (NEW.id, 'Cliente Ganho', '#22c55e', 5),
    (NEW.id, 'Oportunidade Perdida', '#ef4444', 6);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para criar estágios padrão
DROP TRIGGER IF EXISTS after_company_create_stages ON companies;
CREATE TRIGGER after_company_create_stages
AFTER INSERT ON companies
FOR EACH ROW EXECUTE FUNCTION create_default_crm_stages();

-- Trigger para registrar mudanças automaticamente em crm_history
CREATE OR REPLACE FUNCTION log_contact_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.funnel_stage IS DISTINCT FROM NEW.funnel_stage THEN
    INSERT INTO crm_history (contact_id, company_id, user_id, action_type, old_value, new_value)
    VALUES (NEW.id, NEW.company_id, auth.uid(), 'stage_changed', OLD.funnel_stage, NEW.funnel_stage);
  END IF;
  
  IF OLD.assigned_to_user_id IS DISTINCT FROM NEW.assigned_to_user_id THEN
    INSERT INTO crm_history (contact_id, company_id, user_id, action_type, old_value, new_value)
    VALUES (NEW.id, NEW.company_id, auth.uid(), 'assigned', OLD.assigned_to_user_id::text, NEW.assigned_to_user_id::text);
  END IF;
  
  IF OLD.estimated_value IS DISTINCT FROM NEW.estimated_value THEN
    INSERT INTO crm_history (contact_id, company_id, user_id, action_type, old_value, new_value)
    VALUES (NEW.id, NEW.company_id, auth.uid(), 'value_updated', OLD.estimated_value::text, NEW.estimated_value::text);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS contact_changes_log ON contacts;
CREATE TRIGGER contact_changes_log
AFTER UPDATE ON contacts
FOR EACH ROW EXECUTE FUNCTION log_contact_changes();

-- Atualizar RLS de contacts para permissões de atendente/admin
DROP POLICY IF EXISTS "Company contacts" ON contacts;

CREATE POLICY "View own or all contacts" ON contacts
FOR SELECT USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND (
    assigned_to_user_id = auth.uid() 
    OR assigned_to_user_id IS NULL
    OR EXISTS (
      SELECT 1 FROM companies c 
      JOIN profiles p ON p.email = c.owner_email 
      WHERE c.id = contacts.company_id AND p.id = auth.uid()
    )
  )
);

CREATE POLICY "Manage contacts" ON contacts
FOR INSERT
WITH CHECK (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Update own or all contacts" ON contacts
FOR UPDATE USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND (
    assigned_to_user_id = auth.uid()
    OR assigned_to_user_id IS NULL
    OR EXISTS (
      SELECT 1 FROM companies c 
      JOIN profiles p ON p.email = c.owner_email 
      WHERE c.id = contacts.company_id AND p.id = auth.uid()
    )
  )
)
WITH CHECK (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Delete contacts" ON contacts
FOR DELETE USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM companies c 
    JOIN profiles p ON p.email = c.owner_email 
    WHERE c.id = contacts.company_id AND p.id = auth.uid()
  )
);
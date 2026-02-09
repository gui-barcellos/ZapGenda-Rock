-- Fase 1: Atualizar tag_registry com novos campos
ALTER TABLE tag_registry ADD COLUMN IF NOT EXISTS is_system_tag BOOLEAN DEFAULT false;
ALTER TABLE tag_registry ADD COLUMN IF NOT EXISTS is_editable BOOLEAN DEFAULT true;
ALTER TABLE tag_registry ADD COLUMN IF NOT EXISTS show_in_chat BOOLEAN DEFAULT false;
ALTER TABLE tag_registry ADD COLUMN IF NOT EXISTS blocks_ai BOOLEAN DEFAULT false;
ALTER TABLE tag_registry ADD COLUMN IF NOT EXISTS triggers_alert BOOLEAN DEFAULT false;
ALTER TABLE tag_registry ADD COLUMN IF NOT EXISTS alert_sound_enabled BOOLEAN DEFAULT true;
ALTER TABLE tag_registry ADD COLUMN IF NOT EXISTS is_auto_generated BOOLEAN DEFAULT false;
ALTER TABLE tag_registry ADD COLUMN IF NOT EXISTS auto_source TEXT;
ALTER TABLE tag_registry ADD COLUMN IF NOT EXISTS linked_entity_id UUID;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_tag_registry_show_in_chat ON tag_registry(company_id, show_in_chat) WHERE show_in_chat = true;
CREATE INDEX IF NOT EXISTS idx_tag_registry_triggers_alert ON tag_registry(company_id, triggers_alert) WHERE triggers_alert = true;
CREATE INDEX IF NOT EXISTS idx_tag_registry_auto_generated ON tag_registry(company_id, is_auto_generated) WHERE is_auto_generated = true;

-- Atualizar company_subscriptions com limite de tags
ALTER TABLE company_subscriptions 
ADD COLUMN IF NOT EXISTS max_custom_tags INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS current_custom_tags INTEGER DEFAULT 0;

-- Função para criar tags padrão
CREATE OR REPLACE FUNCTION public.create_default_tags_for_company(_company_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Sistema
  INSERT INTO tag_registry (company_id, name, category, color, is_system_tag, is_editable, show_in_chat, blocks_ai)
  VALUES 
    (_company_id, 'IA Desativada', 'Sistema', '#ef4444', true, false, false, true)
  ON CONFLICT (company_id, name) DO NOTHING;

  -- Atendimento (visível no chat)
  INSERT INTO tag_registry (company_id, name, category, color, is_system_tag, is_editable, show_in_chat, triggers_alert)
  VALUES 
    (_company_id, 'Urgente', 'Atendimento', '#dc2626', true, false, true, true),
    (_company_id, 'Aguardando Humano', 'Atendimento', '#f97316', true, false, true, false),
    (_company_id, 'Aguardando Resposta', 'Atendimento', '#eab308', true, false, true, false)
  ON CONFLICT (company_id, name) DO NOTHING;

  -- Origem
  INSERT INTO tag_registry (company_id, name, category, color, show_in_chat)
  VALUES 
    (_company_id, 'WhatsApp', 'Origem', '#25D366', false),
    (_company_id, 'Instagram', 'Origem', '#E4405F', false),
    (_company_id, 'Site', 'Origem', '#3b82f6', false),
    (_company_id, 'Indicação', 'Origem', '#8b5cf6', false),
    (_company_id, 'Presencial', 'Origem', '#10b981', false)
  ON CONFLICT (company_id, name) DO NOTHING;

  -- Comportamento
  INSERT INTO tag_registry (company_id, name, category, color, show_in_chat)
  VALUES 
    (_company_id, 'Faltou', 'Comportamento', '#ef4444', false),
    (_company_id, 'Retorno Agendado', 'Comportamento', '#10b981', false),
    (_company_id, 'Cancelou', 'Comportamento', '#f59e0b', false),
    (_company_id, 'Aguardando Confirmação', 'Comportamento', '#3b82f6', false)
  ON CONFLICT (company_id, name) DO NOTHING;
END;
$$;

-- Trigger para criar tags ao criar empresa
CREATE OR REPLACE FUNCTION public.trigger_create_default_tags()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM create_default_tags_for_company(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_company_created_create_tags ON companies;
CREATE TRIGGER on_company_created_create_tags
  AFTER INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_default_tags();

-- Fase 2: Trigger para adicionar tags ao criar appointment
CREATE OR REPLACE FUNCTION public.add_tags_on_appointment_create()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  prof_name TEXT;
  service_name TEXT;
BEGIN
  -- Buscar nome do profissional
  SELECT name INTO prof_name FROM professionals WHERE id = NEW.professional_id;
  
  -- Buscar nome do serviço
  SELECT name INTO service_name FROM services WHERE id = NEW.service_id;
  
  -- Criar tags se não existirem
  IF prof_name IS NOT NULL THEN
    INSERT INTO tag_registry (company_id, name, category, color, is_auto_generated, auto_source, linked_entity_id)
    VALUES (NEW.company_id, prof_name, 'Profissional/Serviço', '#6366f1', true, 'professional', NEW.professional_id)
    ON CONFLICT (company_id, name) DO NOTHING;
    
    -- Adicionar tag ao contato
    UPDATE contacts 
    SET tags = CASE 
      WHEN tags IS NULL THEN ARRAY[prof_name]
      WHEN NOT (prof_name = ANY(tags)) THEN array_append(tags, prof_name)
      ELSE tags
    END
    WHERE id = NEW.contact_id;
  END IF;
  
  IF service_name IS NOT NULL THEN
    INSERT INTO tag_registry (company_id, name, category, color, is_auto_generated, auto_source, linked_entity_id)
    VALUES (NEW.company_id, service_name, 'Profissional/Serviço', '#8b5cf6', true, 'service', NEW.service_id)
    ON CONFLICT (company_id, name) DO NOTHING;
    
    UPDATE contacts 
    SET tags = CASE 
      WHEN tags IS NULL THEN ARRAY[service_name]
      WHEN NOT (service_name = ANY(tags)) THEN array_append(tags, service_name)
      ELSE tags
    END
    WHERE id = NEW.contact_id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_appointment_create_add_tags ON appointments;
CREATE TRIGGER on_appointment_create_add_tags
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION add_tags_on_appointment_create();
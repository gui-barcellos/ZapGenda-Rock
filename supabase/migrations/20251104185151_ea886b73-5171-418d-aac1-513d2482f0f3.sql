-- Fase 2: Criar tabela tag_registry
CREATE TABLE tag_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text DEFAULT '#3b82f6',
  category text,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  UNIQUE(company_id, name)
);

-- RLS Policies para tag_registry
ALTER TABLE tag_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company tag_registry"
ON tag_registry FOR ALL
USING (company_id IN (
  SELECT company_id FROM profiles WHERE id = auth.uid()
))
WITH CHECK (company_id IN (
  SELECT company_id FROM profiles WHERE id = auth.uid()
));

-- Função RPC: rename_tag_globally
CREATE OR REPLACE FUNCTION rename_tag_globally(
  _company_id uuid,
  _old_name text,
  _new_name text
) RETURNS void AS $$
BEGIN
  -- Update all contacts with this tag
  UPDATE contacts
  SET tags = array_replace(tags, _old_name, _new_name)
  WHERE company_id = _company_id 
    AND _old_name = ANY(tags);
  
  -- Update tag registry if exists
  UPDATE tag_registry
  SET name = _new_name, updated_at = now()
  WHERE company_id = _company_id AND name = _old_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função RPC: delete_tag_globally
CREATE OR REPLACE FUNCTION delete_tag_globally(
  _company_id uuid,
  _tag_name text
) RETURNS integer AS $$
DECLARE
  affected_count integer;
BEGIN
  -- Remove tag from all contacts
  UPDATE contacts
  SET tags = array_remove(tags, _tag_name)
  WHERE company_id = _company_id 
    AND _tag_name = ANY(tags);
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  
  -- Delete from registry
  DELETE FROM tag_registry
  WHERE company_id = _company_id AND name = _tag_name;
  
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fase 5: Criar tabela tag_automation_rules
CREATE TABLE tag_automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  trigger_event text NOT NULL,
  conditions jsonb,
  tags_to_add text[],
  tags_to_remove text[],
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

-- RLS Policies para tag_automation_rules
ALTER TABLE tag_automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company tag_automation"
ON tag_automation_rules FOR ALL
USING (company_id IN (
  SELECT company_id FROM profiles WHERE id = auth.uid()
))
WITH CHECK (company_id IN (
  SELECT company_id FROM profiles WHERE id = auth.uid()
));

-- Função: apply_tag_automation_rules
CREATE OR REPLACE FUNCTION apply_tag_automation_rules()
RETURNS TRIGGER AS $$
DECLARE
  rule RECORD;
  conditions_met boolean;
  condition_key text;
  condition_value text;
BEGIN
  -- Loop through active rules for this company
  FOR rule IN 
    SELECT * FROM tag_automation_rules 
    WHERE company_id = NEW.company_id 
      AND is_active = true
      AND trigger_event = TG_ARGV[0]
  LOOP
    -- Check if conditions match
    conditions_met := true;
    
    IF rule.conditions IS NOT NULL THEN
      FOR condition_key, condition_value IN SELECT * FROM jsonb_each_text(rule.conditions)
      LOOP
        -- Check each condition
        IF condition_key = 'lead_source' AND NEW.lead_source != condition_value THEN
          conditions_met := false;
          EXIT;
        ELSIF condition_key = 'funnel_stage' AND NEW.funnel_stage != condition_value THEN
          conditions_met := false;
          EXIT;
        END IF;
      END LOOP;
    END IF;
    
    IF conditions_met THEN
      -- Add tags
      IF rule.tags_to_add IS NOT NULL THEN
        NEW.tags := array(
          SELECT DISTINCT unnest(
            COALESCE(NEW.tags, ARRAY[]::text[]) || rule.tags_to_add
          )
        );
      END IF;
      
      -- Remove tags
      IF rule.tags_to_remove IS NOT NULL THEN
        NEW.tags := array(
          SELECT unnest(NEW.tags)
          EXCEPT
          SELECT unnest(rule.tags_to_remove)
        );
      END IF;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers no contacts
CREATE TRIGGER trg_apply_tag_automation_on_insert
BEFORE INSERT ON contacts
FOR EACH ROW
EXECUTE FUNCTION apply_tag_automation_rules('contact_created');

CREATE TRIGGER trg_apply_tag_automation_on_update
BEFORE UPDATE ON contacts
FOR EACH ROW
EXECUTE FUNCTION apply_tag_automation_rules('contact_updated');
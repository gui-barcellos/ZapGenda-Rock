-- Add new fields for AI personality and tone
ALTER TABLE company_ai_settings 
ADD COLUMN ai_personality_type TEXT DEFAULT 'acolhedora' CHECK (ai_personality_type IN ('acolhedora', 'eficiente', 'amigavel')),
ADD COLUMN ai_tone TEXT DEFAULT 'neutro' CHECK (ai_tone IN ('formal', 'neutro', 'casual')),
ADD COLUMN greeting_show_always BOOLEAN DEFAULT false,
ADD COLUMN urgency_sound_enabled BOOLEAN DEFAULT true,
ADD COLUMN urgency_sound_type TEXT DEFAULT 'alert2' CHECK (urgency_sound_type IN ('alert1', 'alert2', 'alert3'));

-- Update create_default_tags_for_company function to use 'Agendamento' category
CREATE OR REPLACE FUNCTION public.create_default_tags_for_company(_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  -- Agendamento (anteriormente Comportamento)
  INSERT INTO tag_registry (company_id, name, category, color, show_in_chat)
  VALUES 
    (_company_id, 'Aguardando Confirmação', 'Agendamento', '#3b82f6', false),
    (_company_id, 'Confirmou', 'Agendamento', '#10b981', false),
    (_company_id, 'Compareceu', 'Agendamento', '#22c55e', false),
    (_company_id, 'Não Compareceu', 'Agendamento', '#ef4444', false),
    (_company_id, 'Cancelou', 'Agendamento', '#f59e0b', false),
    (_company_id, 'Retorno Agendado', 'Agendamento', '#8b5cf6', false)
  ON CONFLICT (company_id, name) DO NOTHING;
END;
$function$;

-- Update existing tags from 'Comportamento' to 'Agendamento'
UPDATE tag_registry 
SET category = 'Agendamento' 
WHERE category = 'Comportamento';
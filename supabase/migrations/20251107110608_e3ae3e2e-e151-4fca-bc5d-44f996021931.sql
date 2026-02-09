-- Adicionar colunas para notificações sonoras de escalação
ALTER TABLE company_ai_settings
ADD COLUMN IF NOT EXISTS escalation_sound_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS escalation_sound_type TEXT DEFAULT 'notification2' CHECK (escalation_sound_type IN ('notification1', 'notification2', 'notification3'));
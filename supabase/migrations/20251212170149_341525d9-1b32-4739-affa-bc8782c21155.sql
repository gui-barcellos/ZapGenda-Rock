-- =====================================================
-- FASE 0: PREPARAÇÃO DO ESTADO (Nova arquitetura de orquestração)
-- =====================================================

-- 1. Criar tabela conversation_state para controle determinístico de fluxo
CREATE TABLE IF NOT EXISTS public.conversation_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Estado do fluxo (idle, scheduling, canceling, rescheduling, consulting)
  stage TEXT NOT NULL DEFAULT 'idle',
  
  -- Dados parciais coletados durante fluxo
  collected_data JSONB DEFAULT '{}',
  
  -- Flags determinísticas (calculadas pelo backend, não pela IA)
  has_previous_appointment BOOLEAN DEFAULT FALSE,
  has_active_appointment BOOLEAN DEFAULT FALSE,
  pending_action TEXT, -- "confirm_cancel", "confirm_schedule", etc.
  
  -- Controle de expiração (sliding window de 30 minutos)
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 minutes',
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(conversation_id)
);

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_conversation_state_conversation ON conversation_state(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_state_expires ON conversation_state(expires_at) WHERE stage != 'idle';
CREATE INDEX IF NOT EXISTS idx_conversation_state_company ON conversation_state(company_id);

-- 3. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_conversation_state_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_conversation_state_updated ON conversation_state;
CREATE TRIGGER trg_conversation_state_updated
  BEFORE UPDATE ON conversation_state
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_state_timestamp();

-- 4. Adicionar feature flag para migração gradual
ALTER TABLE company_ai_settings 
ADD COLUMN IF NOT EXISTS use_function_calling BOOLEAN DEFAULT FALSE;

-- 5. Adicionar coluna para configurações dinâmicas do novo sistema
ALTER TABLE company_ai_settings 
ADD COLUMN IF NOT EXISTS state_expiration_minutes INTEGER DEFAULT 30;

-- 6. Habilitar RLS
ALTER TABLE conversation_state ENABLE ROW LEVEL SECURITY;

-- 7. Políticas RLS
CREATE POLICY "Company conversation_state" ON conversation_state
  FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Superuser conversation_state" ON conversation_state
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'superuser'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superuser'::app_role));

-- 8. Habilitar Realtime para sincronização de estado
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_state;

-- 9. Comentários para documentação
COMMENT ON TABLE conversation_state IS 'Estado determinístico da conversa para arquitetura Backend Orquestrador';
COMMENT ON COLUMN conversation_state.stage IS 'Estado atual: idle, scheduling, canceling, rescheduling, consulting';
COMMENT ON COLUMN conversation_state.collected_data IS 'Dados parciais coletados: {professional_id, service_id, date, time}';
COMMENT ON COLUMN conversation_state.expires_at IS 'Expiração com sliding window de 30 min (reset a cada interação)';
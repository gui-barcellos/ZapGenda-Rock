-- Adicionar novas colunas na tabela conversations
ALTER TABLE conversations 
  ADD COLUMN is_unread BOOLEAN DEFAULT true,
  ADD COLUMN is_favorite BOOLEAN DEFAULT false,
  ADD COLUMN ai_disabled_until TIMESTAMP WITH TIME ZONE;

-- Criar índices para melhorar performance
CREATE INDEX idx_conversations_is_unread ON conversations(is_unread);
CREATE INDEX idx_conversations_is_favorite ON conversations(is_favorite);
CREATE INDEX idx_conversations_ai_disabled_until ON conversations(ai_disabled_until);

-- Marcar conversas existentes como lidas (assumindo que já foram vistas)
UPDATE conversations SET is_unread = false WHERE is_unread IS NULL;
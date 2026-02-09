-- =====================================================
-- Correção de Ordem de Mensagens usando Timestamp Z-API
-- Adiciona whatsapp_timestamp para resolver race conditions
-- =====================================================

-- Adicionar coluna para armazenar timestamp do Z-API (milissegundos)
ALTER TABLE whatsapp_messages 
ADD COLUMN whatsapp_timestamp BIGINT;

-- Criar índice para ordenação eficiente por timestamp
CREATE INDEX idx_whatsapp_messages_timestamp 
ON whatsapp_messages(conversation_id, whatsapp_timestamp DESC);

-- Preencher timestamps existentes com created_at convertido (para dados antigos)
UPDATE whatsapp_messages 
SET whatsapp_timestamp = EXTRACT(EPOCH FROM created_at)::BIGINT * 1000
WHERE whatsapp_timestamp IS NULL;

-- Tornar NOT NULL após preencher
ALTER TABLE whatsapp_messages 
ALTER COLUMN whatsapp_timestamp SET NOT NULL;
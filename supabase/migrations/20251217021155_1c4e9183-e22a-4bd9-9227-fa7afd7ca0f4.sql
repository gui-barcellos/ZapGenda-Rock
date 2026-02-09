-- Adicionar coluna last_response_id para memória nativa da Responses API
ALTER TABLE conversation_state 
ADD COLUMN IF NOT EXISTS last_response_id TEXT;

COMMENT ON COLUMN conversation_state.last_response_id IS 'ID da última resposta da OpenAI para encadeamento via previous_response_id - memória nativa';
-- Adicionar novos campos para logging completo
ALTER TABLE ai_prompt_logs 
ADD COLUMN IF NOT EXISTS is_first_message BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS previous_response_id TEXT,
ADD COLUMN IF NOT EXISTS response_id_generated TEXT,
ADD COLUMN IF NOT EXISTS function_calls JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS conversation_stage TEXT,
ADD COLUMN IF NOT EXISTS loop_iterations INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS user_message TEXT;

-- Índices para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_ai_prompt_logs_conversation 
ON ai_prompt_logs(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_prompt_logs_company_date 
ON ai_prompt_logs(company_id, created_at DESC);

-- Comentários para documentação
COMMENT ON COLUMN ai_prompt_logs.is_first_message IS 'Se foi a primeira mensagem da conversa (sem previous_response_id)';
COMMENT ON COLUMN ai_prompt_logs.previous_response_id IS 'ID da resposta anterior usada para encadeamento';
COMMENT ON COLUMN ai_prompt_logs.response_id_generated IS 'ID da resposta gerada nesta interação';
COMMENT ON COLUMN ai_prompt_logs.function_calls IS 'Array de function calls executadas [{name, args, result}]';
COMMENT ON COLUMN ai_prompt_logs.conversation_stage IS 'Stage da conversa (idle, scheduling, etc)';
COMMENT ON COLUMN ai_prompt_logs.loop_iterations IS 'Número de iterações do loop de tool calls';
COMMENT ON COLUMN ai_prompt_logs.user_message IS 'Mensagem original do usuário';
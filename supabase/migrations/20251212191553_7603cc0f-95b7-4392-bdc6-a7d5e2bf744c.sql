-- Adicionar context_window ao ai_master_prompt (sem limite rígido, default 10)
ALTER TABLE ai_master_prompt 
ADD COLUMN IF NOT EXISTS context_window INTEGER DEFAULT 10;

-- Adicionar confirmed_facts como JSONB ao conversation_state
-- Estrutura: [{ type, value, id?, timestamp }]
-- REGRA: Escrito APENAS por eventos determinísticos (tool_call success)
ALTER TABLE conversation_state 
ADD COLUMN IF NOT EXISTS confirmed_facts JSONB DEFAULT '[]'::jsonb;
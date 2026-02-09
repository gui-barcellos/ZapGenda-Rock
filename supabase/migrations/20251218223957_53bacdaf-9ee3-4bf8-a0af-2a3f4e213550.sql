
-- Primeiro adicionar constraint única no handler para evitar duplicatas futuras
ALTER TABLE ai_action_definitions ADD CONSTRAINT ai_action_definitions_handler_key UNIQUE (handler);

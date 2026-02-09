-- Atualizar DEFAULT para novos registros
ALTER TABLE company_ai_settings 
ALTER COLUMN greeting_message SET DEFAULT '{cumprimento}, {nome_cliente}! Sou {nome_assistente}, assistente da {empresa}. Como posso ajudar você hoje?';

-- Atualizar TODOS os registros existentes para a nova mensagem padrão
UPDATE company_ai_settings 
SET greeting_message = '{cumprimento}, {nome_cliente}! Sou {nome_assistente}, assistente da {empresa}. Como posso ajudar você hoje?';

-- Forçar greeting_time_based = true para todos (variável sempre funciona)
UPDATE company_ai_settings 
SET greeting_time_based = true;
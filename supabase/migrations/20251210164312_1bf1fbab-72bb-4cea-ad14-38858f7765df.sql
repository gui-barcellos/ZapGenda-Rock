-- Adicionar colunas de controle de tags para IA na tabela tag_registry
ALTER TABLE tag_registry 
ADD COLUMN IF NOT EXISTS can_ai_insert BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS can_ai_remove BOOLEAN DEFAULT false;

-- Comentários para documentação
COMMENT ON COLUMN tag_registry.can_ai_insert IS 'Define se a IA pode inserir esta tag automaticamente em contatos';
COMMENT ON COLUMN tag_registry.can_ai_remove IS 'Define se a IA pode remover esta tag automaticamente de contatos';

-- Atualizar tags padrão do sistema com permissões de IA
-- Tags que a IA PODE inserir
UPDATE tag_registry 
SET can_ai_insert = true 
WHERE name IN ('Urgente', 'Aguardando Humano', 'Aguardando Confirmação', 'Confirmou', 'Compareceu', 'Não Compareceu', 'Cancelou')
  AND is_system_tag = true;

-- Tags que a IA PODE remover
UPDATE tag_registry 
SET can_ai_remove = true 
WHERE name IN ('Aguardando Resposta', 'Aguardando Confirmação')
  AND is_system_tag = true;

-- Tag "IA Desativada" NÃO pode ser tocada pela IA (somente humanos)
UPDATE tag_registry 
SET can_ai_insert = false, can_ai_remove = false 
WHERE name = 'IA Desativada';
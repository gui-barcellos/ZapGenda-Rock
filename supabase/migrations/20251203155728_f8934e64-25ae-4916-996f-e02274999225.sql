-- Adicionar campos CPF e telefone secundário na tabela contacts
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS cpf text,
ADD COLUMN IF NOT EXISTS secondary_phone text;

-- Índice para busca por CPF (parcial, só onde cpf não é null)
CREATE INDEX IF NOT EXISTS idx_contacts_cpf 
ON contacts(company_id, cpf) 
WHERE cpf IS NOT NULL;

-- Índice para busca por telefone secundário
CREATE INDEX IF NOT EXISTS idx_contacts_secondary_phone 
ON contacts(company_id, secondary_phone) 
WHERE secondary_phone IS NOT NULL;
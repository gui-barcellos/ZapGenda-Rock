-- Adicionar coluna is_blocked na tabela contacts
ALTER TABLE contacts 
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;

-- Criar índice para otimizar queries
CREATE INDEX IF NOT EXISTS idx_contacts_blocked ON contacts(is_blocked);
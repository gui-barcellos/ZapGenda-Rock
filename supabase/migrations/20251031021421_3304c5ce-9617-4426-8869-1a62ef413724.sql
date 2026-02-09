-- Adicionar description e professional_id à tabela services
ALTER TABLE services 
  ADD COLUMN description TEXT,
  ADD COLUMN professional_id UUID REFERENCES professionals(id) ON DELETE SET NULL;

-- Criar índice para performance
CREATE INDEX idx_services_professional_id ON services(professional_id);
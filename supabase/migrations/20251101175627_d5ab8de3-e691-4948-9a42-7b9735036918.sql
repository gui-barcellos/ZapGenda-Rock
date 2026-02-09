-- Adicionar novos campos na tabela company_settings
ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS has_physical_address BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS google_maps_link TEXT,
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Sao_Paulo',
ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT '[]'::jsonb;

-- Comentários para documentação
COMMENT ON COLUMN company_settings.address IS 'Endereço completo da empresa';
COMMENT ON COLUMN company_settings.has_physical_address IS 'Indica se a empresa tem endereço físico';
COMMENT ON COLUMN company_settings.google_maps_link IS 'Link do Google Maps (opcional)';
COMMENT ON COLUMN company_settings.timezone IS 'Fuso horário da empresa';
COMMENT ON COLUMN company_settings.business_hours IS 'Horário de funcionamento: [{day: 0-6, start: "08:00", end: "18:00", is_active: true}]';
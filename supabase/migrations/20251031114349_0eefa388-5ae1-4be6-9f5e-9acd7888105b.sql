-- 1. Criar tabela de junção service_professionals (relação muitos-para-muitos)
CREATE TABLE service_professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(service_id, professional_id)
);

-- RLS policy para service_professionals
ALTER TABLE service_professionals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company service_professionals"
  ON service_professionals
  FOR ALL
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ))
  WITH CHECK (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

-- 2. Criar tabela service_availability (disponibilidade DO SERVIÇO)
CREATE TABLE service_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (end_time > start_time)
);

-- RLS policy para service_availability
ALTER TABLE service_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company service_availability"
  ON service_availability
  FOR ALL
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ))
  WITH CHECK (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

-- 3. Migrar dados existentes de services.professional_id para service_professionals
INSERT INTO service_professionals (service_id, professional_id, company_id)
SELECT id, professional_id, company_id
FROM services
WHERE professional_id IS NOT NULL;

-- 4. Remover coluna professional_id de services
ALTER TABLE services DROP COLUMN professional_id;
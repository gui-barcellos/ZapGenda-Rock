-- Adicionar campos para separar regras de IA e Atendentes
ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS max_advance_days_ai INTEGER DEFAULT 30 CHECK (max_advance_days_ai > 0),
ADD COLUMN IF NOT EXISTS max_advance_days_manual INTEGER DEFAULT 180 CHECK (max_advance_days_manual > 0),
ADD COLUMN IF NOT EXISTS min_advance_hours_ai INTEGER DEFAULT 2 CHECK (min_advance_hours_ai >= 0),
ADD COLUMN IF NOT EXISTS min_advance_hours_manual INTEGER DEFAULT 0 CHECK (min_advance_hours_manual >= 0);

-- Adicionar campos para modo de agendamento mensal
ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS scheduling_mode TEXT DEFAULT 'rolling' CHECK (scheduling_mode IN ('rolling', 'monthly')),
ADD COLUMN IF NOT EXISTS open_next_month_on_day INTEGER DEFAULT 25 CHECK (open_next_month_on_day BETWEEN 1 AND 28),
ADD COLUMN IF NOT EXISTS months_ahead_visible INTEGER DEFAULT 1 CHECK (months_ahead_visible BETWEEN 1 AND 6);

-- Migrar dados existentes (copiar valores atuais para os novos campos)
UPDATE company_settings
SET 
  max_advance_days_ai = COALESCE(max_advance_days, 30),
  max_advance_days_manual = COALESCE(max_advance_days * 2, 180),
  min_advance_hours_ai = COALESCE(min_advance_hours, 2),
  min_advance_hours_manual = GREATEST(COALESCE(min_advance_hours - 1, 0), 0)
WHERE max_advance_days_ai IS NULL;
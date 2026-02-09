-- Fix duplicate CRM stage inserts on company creation.
-- Keep a single trigger and make the default insert idempotent.

-- Drop duplicate trigger if present.
DROP TRIGGER IF EXISTS after_company_create_stages ON public.companies;

-- Ensure idempotent insert for default CRM stages.
CREATE OR REPLACE FUNCTION public.create_default_crm_stages()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO crm_stages (company_id, name, color, order_position) VALUES
    (NEW.id, 'Lead Novo', '#3b82f6', 1),
    (NEW.id, 'Em Contato', '#8b5cf6', 2),
    (NEW.id, 'Proposta Enviada', '#f59e0b', 3),
    (NEW.id, 'Em Negociacao', '#10b981', 4),
    (NEW.id, 'Cliente Ganho', '#22c55e', 5),
    (NEW.id, 'Oportunidade Perdida', '#ef4444', 6)
  ON CONFLICT (company_id, order_position) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Ensure the canonical trigger exists.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_create_default_crm_stages'
  ) THEN
    CREATE TRIGGER trg_create_default_crm_stages
    AFTER INSERT ON public.companies
    FOR EACH ROW EXECUTE FUNCTION public.create_default_crm_stages();
  END IF;
END;
$$;

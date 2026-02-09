-- 1) Ensure trigger to create default CRM stages on new companies
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

-- 2) Create RPC to ensure default CRM stages on demand (idempotent)
CREATE OR REPLACE FUNCTION public.ensure_default_crm_stages(_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Authorization: user must belong to the company or be superuser
  IF NOT (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() AND p.company_id = _company_id
    )
    OR public.has_role(auth.uid(), 'superuser')
  ) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  -- Insert defaults only if no stages exist yet for this company
  INSERT INTO crm_stages (company_id, name, color, order_position)
  SELECT _company_id, v.name, v.color, v.order_position
  FROM (VALUES
    ('Lead Novo', '#3b82f6', 1),
    ('Em Contato', '#8b5cf6', 2),
    ('Proposta Enviada', '#f59e0b', 3),
    ('Em Negociação', '#10b981', 4),
    ('Cliente Ganho', '#22c55e', 5),
    ('Oportunidade Perdida', '#ef4444', 6)
  ) AS v(name, color, order_position)
  WHERE NOT EXISTS (
    SELECT 1 FROM crm_stages cs WHERE cs.company_id = _company_id
  );
END;
$function$;
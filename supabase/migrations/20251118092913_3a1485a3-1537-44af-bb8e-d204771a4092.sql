-- Alterar default de ai_enabled para false
ALTER TABLE company_ai_settings 
ALTER COLUMN ai_enabled SET DEFAULT false;

-- Criar função trigger para criar company_ai_settings automaticamente
CREATE OR REPLACE FUNCTION public.ensure_company_ai_settings()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.company_ai_settings (company_id, ai_enabled) 
  VALUES (NEW.id, false)
  ON CONFLICT (company_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Criar trigger para novas empresas
DROP TRIGGER IF EXISTS tr_company_ai_settings ON public.companies;
CREATE TRIGGER tr_company_ai_settings 
AFTER INSERT ON public.companies
FOR EACH ROW 
EXECUTE FUNCTION public.ensure_company_ai_settings();

-- Criar company_ai_settings faltantes com IA DESATIVADA (retroativo)
INSERT INTO public.company_ai_settings (company_id, ai_enabled)
SELECT c.id, false
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.company_ai_settings ai 
  WHERE ai.company_id = c.id
);

-- Desativar IA em empresas existentes que não tem todos os campos preenchidos
UPDATE public.company_ai_settings 
SET ai_enabled = false
WHERE ai_name IS NULL 
   OR ai_name = ''
   OR escalation_rules IS NULL 
   OR escalation_rules = ''
   OR urgency_rules IS NULL 
   OR urgency_rules = '';
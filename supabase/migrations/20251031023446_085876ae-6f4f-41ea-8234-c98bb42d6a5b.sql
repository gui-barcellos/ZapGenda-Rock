-- Criar bucket público para logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acesso ao bucket company-logos
CREATE POLICY "company-logos public read" ON storage.objects
FOR SELECT 
USING (bucket_id = 'company-logos');

CREATE POLICY "company-logos upsert own company" ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'company-logos' AND
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND (storage.foldername(name))[1] = p.company_id::text
  )
);

CREATE POLICY "company-logos update own company" ON storage.objects
FOR UPDATE 
USING (
  bucket_id = 'company-logos' AND
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND (storage.foldername(name))[1] = p.company_id::text
  )
);

CREATE POLICY "company-logos delete own company" ON storage.objects
FOR DELETE 
USING (
  bucket_id = 'company-logos' AND
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND (storage.foldername(name))[1] = p.company_id::text
  )
);

-- Garantir que todas as empresas tenham company_settings
INSERT INTO public.company_settings (company_id)
SELECT c.id FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.company_settings s 
  WHERE s.company_id = c.id
);

-- Função para garantir company_settings em novas empresas
CREATE OR REPLACE FUNCTION public.ensure_company_settings()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.company_settings (company_id) 
  VALUES (NEW.id) 
  ON CONFLICT (company_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger para futuras empresas
DROP TRIGGER IF EXISTS tr_company_settings ON public.companies;
CREATE TRIGGER tr_company_settings 
AFTER INSERT ON public.companies
FOR EACH ROW 
EXECUTE FUNCTION public.ensure_company_settings();
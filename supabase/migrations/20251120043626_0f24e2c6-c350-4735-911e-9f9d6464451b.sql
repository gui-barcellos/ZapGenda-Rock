-- Criar tabela global para armazenar Client Token da Z-API
CREATE TABLE IF NOT EXISTS public.zapi_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_token TEXT NOT NULL,
  updated_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.zapi_settings ENABLE ROW LEVEL SECURITY;

-- Política: apenas superuser pode gerenciar
CREATE POLICY "Superuser zapi_settings"
ON public.zapi_settings
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'superuser'::app_role))
WITH CHECK (has_role(auth.uid(), 'superuser'::app_role));

-- Função para retornar token mascarado (apenas para superuser)
CREATE OR REPLACE FUNCTION public.get_masked_zapi_client_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  full_token TEXT;
BEGIN
  -- Verificar se é superuser
  IF NOT has_role(auth.uid(), 'superuser'::app_role) THEN
    RETURN NULL;
  END IF;
  
  -- Pegar token mais recente
  SELECT client_token INTO full_token 
  FROM zapi_settings 
  ORDER BY updated_at DESC 
  LIMIT 1;
  
  IF full_token IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Retornar token mascarado (primeiros 8 + ... + últimos 4)
  IF LENGTH(full_token) <= 12 THEN
    RETURN SUBSTRING(full_token, 1, 4) || '...' || RIGHT(full_token, 2);
  ELSE
    RETURN SUBSTRING(full_token, 1, 8) || '...' || RIGHT(full_token, 4);
  END IF;
END;
$$;

-- Remover coluna z_api_client_token da tabela whatsapp_connections
ALTER TABLE public.whatsapp_connections DROP COLUMN IF EXISTS z_api_client_token;
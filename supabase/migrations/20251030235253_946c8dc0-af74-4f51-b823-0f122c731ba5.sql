-- Criar tabela stripe_settings
CREATE TABLE IF NOT EXISTS stripe_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key TEXT NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS Policy (apenas superuser)
ALTER TABLE stripe_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superuser stripe_settings" 
ON stripe_settings
FOR ALL
USING (has_role(auth.uid(), 'superuser'::app_role))
WITH CHECK (has_role(auth.uid(), 'superuser'::app_role));

-- Função para retornar chave mascarada
CREATE OR REPLACE FUNCTION get_masked_stripe_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  full_key TEXT;
BEGIN
  -- Verifica se é superuser
  IF NOT has_role(auth.uid(), 'superuser'::app_role) THEN
    RETURN NULL;
  END IF;
  
  -- Pega a chave mais recente
  SELECT api_key INTO full_key 
  FROM stripe_settings 
  ORDER BY updated_at DESC 
  LIMIT 1;
  
  IF full_key IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Retorna chave mascarada (sk_...últimos4)
  -- Chaves Stripe começam com sk_test_ ou sk_live_
  IF full_key LIKE 'sk_test_%' THEN
    RETURN 'sk_test_...' || RIGHT(full_key, 4);
  ELSIF full_key LIKE 'sk_live_%' THEN
    RETURN 'sk_live_...' || RIGHT(full_key, 4);
  ELSE
    RETURN 'sk_...' || RIGHT(full_key, 4);
  END IF;
END;
$$;
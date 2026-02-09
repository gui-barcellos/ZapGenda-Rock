-- Criar função para auto-preencher company_id nos contatos
CREATE OR REPLACE FUNCTION public.set_contact_company_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Pega o company_id do perfil do usuário autenticado
  IF NEW.company_id IS NULL THEN
    NEW.company_id := (SELECT company_id FROM profiles WHERE id = auth.uid());
  END IF;
  
  -- Se ainda for NULL, lança erro
  IF NEW.company_id IS NULL THEN
    RAISE EXCEPTION 'Não foi possível determinar company_id do usuário';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para executar a função antes de inserir contatos
DROP TRIGGER IF EXISTS set_contact_company_id_trigger ON contacts;
CREATE TRIGGER set_contact_company_id_trigger
BEFORE INSERT ON contacts
FOR EACH ROW
EXECUTE FUNCTION public.set_contact_company_id();
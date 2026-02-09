-- Bootstrap RPC to create first superuser without requiring an auth session
CREATE OR REPLACE FUNCTION public.bootstrap_superuser(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.superuser_exists() THEN
    RETURN false;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, 'superuser');

  RETURN true;
EXCEPTION
  WHEN unique_violation THEN
    RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bootstrap_superuser(uuid) TO anon, authenticated;

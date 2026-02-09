-- Delete existing user (will cascade to related tables)
DELETE FROM auth.users WHERE email = 'guilhermebarcellos@rocketmail.com';

-- Create function to check if any superuser exists
CREATE OR REPLACE FUNCTION public.superuser_exists()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE role = 'superuser'
  )
$$;

-- Add policy to allow first superuser creation
CREATE POLICY "Allow first superuser creation"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  NOT public.superuser_exists() 
  AND user_id = auth.uid() 
  AND role = 'superuser'::app_role
);
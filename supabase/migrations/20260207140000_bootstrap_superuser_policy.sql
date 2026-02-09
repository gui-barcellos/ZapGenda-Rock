-- Allow first superuser creation when none exists
DROP POLICY IF EXISTS "Bootstrap superuser" ON user_roles;

CREATE POLICY "Bootstrap superuser" ON user_roles
FOR INSERT TO authenticated
WITH CHECK (
  role = 'superuser'
  AND user_id = auth.uid()
  AND NOT superuser_exists()
);

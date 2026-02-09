-- Allow superuser to read audit_logs across companies
CREATE POLICY "Superuser audit_logs"
ON audit_logs
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'superuser'));

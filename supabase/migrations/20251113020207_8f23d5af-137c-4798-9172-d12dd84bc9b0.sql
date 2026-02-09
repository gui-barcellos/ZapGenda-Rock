-- Adicionar RLS para rate_limits
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy para superusers gerenciarem rate limits
CREATE POLICY "Superusers can manage rate limits"
  ON rate_limits
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'superuser'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superuser'::app_role));

-- Policy para edge functions acessarem rate limits (service role)
CREATE POLICY "Service role can manage rate limits"
  ON rate_limits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
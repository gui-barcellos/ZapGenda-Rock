-- Criar tabela system_logs para monitoramento do superuser
CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  log_type TEXT NOT NULL CHECK (log_type IN ('edge_function', 'realtime', 'error', 'performance')),
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warn', 'error', 'critical')),
  source TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Índices para performance
CREATE INDEX idx_system_logs_created_at ON public.system_logs(created_at DESC);
CREATE INDEX idx_system_logs_log_type ON public.system_logs(log_type);
CREATE INDEX idx_system_logs_severity ON public.system_logs(severity);
CREATE INDEX idx_system_logs_company_id ON public.system_logs(company_id) WHERE company_id IS NOT NULL;

-- RLS Policies (apenas superuser pode acessar)
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superuser full access on system_logs"
  ON public.system_logs
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'superuser'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superuser'::app_role));

-- Função para limpar logs antigos (> 30 dias)
CREATE OR REPLACE FUNCTION public.clean_old_system_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.system_logs
  WHERE created_at < now() - INTERVAL '30 days';
END;
$$;
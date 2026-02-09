-- =====================================================
-- Warming System para zapi-webhook-receiver Edge Function
-- Mantém função aquecida com cron job a cada 2 minutos
-- =====================================================

-- Habilitar extensões (idempotente)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remover job anterior se existir (para re-runs)
DO $$
BEGIN
  PERFORM cron.unschedule('warm-zapi-webhook-receiver') 
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'warm-zapi-webhook-receiver'
  );
END $$;

-- Criar job de warming - a cada 2 minutos
SELECT cron.schedule(
  'warm-zapi-webhook-receiver',
  '*/2 * * * *', -- Cron: a cada 2 minutos
  $$
  SELECT
    net.http_post(
      url := 'https://bqrqyljspwruxabbonml.supabase.co/functions/v1/zapi-webhook-receiver',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Warming', 'true',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxcnF5bGpzcHdydXhhYmJvbm1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4MDI3MjAsImV4cCI6MjA3NzM3ODcyMH0.X3Y4gpobxPfxyJ9sw7nCm_qRlZNOUZCx2We_q7Dt-bs'
      ),
      body := jsonb_build_object(
        'ping', true,
        'timestamp', extract(epoch from now())
      )
    ) as request_id;
  $$
);
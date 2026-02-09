-- Criar tabela para rate limiting
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  reset_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para cleanup de registros antigos
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON rate_limits(reset_at);

-- Comentários
COMMENT ON TABLE rate_limits IS 'Controle de rate limiting para edge functions';
COMMENT ON COLUMN rate_limits.key IS 'Chave única de rate limit (ex: rate_limit:company_id)';
COMMENT ON COLUMN rate_limits.count IS 'Contador de requisições no período atual';
COMMENT ON COLUMN rate_limits.reset_at IS 'Timestamp de quando o contador será resetado';
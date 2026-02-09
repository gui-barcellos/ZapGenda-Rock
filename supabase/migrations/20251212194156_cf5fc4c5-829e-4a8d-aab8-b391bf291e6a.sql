-- Adicionar state_expiration_minutes ao ai_master_prompt (Cérebro da IA)
-- Expiração é comportamento cognitivo da IA, deve estar junto com context_window, tokens, modelo
ALTER TABLE ai_master_prompt 
ADD COLUMN IF NOT EXISTS state_expiration_minutes INTEGER DEFAULT 30;

-- Comentário explicativo sobre arquitetura de memória
COMMENT ON TABLE ai_master_prompt IS 'Configurações globais do Cérebro da IA. A memória do sistema é composta APENAS por: (1) Estado determinístico (conversation_state), (2) Fatos confirmados (JSONB), (3) Histórico recente (context_window). NÃO usamos embeddings para memória de conversa.';

COMMENT ON COLUMN ai_master_prompt.state_expiration_minutes IS 'Tempo em minutos de inatividade após o qual a conversa expira e o estado volta ao neutro. Padrão: 30 minutos.';
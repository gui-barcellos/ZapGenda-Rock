-- Adicionar coluna paragraph_delay_seconds para controlar delay entre blocos de resposta
ALTER TABLE ai_master_prompt 
ADD COLUMN paragraph_delay_seconds integer DEFAULT 2;

-- Comentário: valor em segundos, sistema aplica ±1s de variação para parecer mais humano
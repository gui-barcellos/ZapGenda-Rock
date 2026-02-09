-- Fase 1: Configurar Realtime com REPLICA IDENTITY FULL e índice de performance

-- Ativar REPLICA IDENTITY FULL para capturar dados completos em updates
ALTER TABLE public.whatsapp_messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;

-- Garantir que tabelas estão na publicação Realtime (idempotente)
DO $$
BEGIN
  -- Adicionar whatsapp_messages se não estiver
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'whatsapp_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
  END IF;
  
  -- Adicionar conversations se não estiver
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;
END $$;

-- Criar índice composto para polling eficiente de mensagens
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conv_created 
ON public.whatsapp_messages(conversation_id, created_at DESC);
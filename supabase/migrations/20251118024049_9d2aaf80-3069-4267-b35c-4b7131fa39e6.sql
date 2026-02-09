-- Adicionar campos para processamento de mídia na tabela whatsapp_messages
ALTER TABLE public.whatsapp_messages 
ADD COLUMN IF NOT EXISTS transcription_text TEXT,
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS media_type TEXT;

-- Criar índice para buscas de transcrições
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_transcription 
ON public.whatsapp_messages(transcription_text) 
WHERE transcription_text IS NOT NULL;

-- Criar tabela para prompt master global da IA
CREATE TABLE IF NOT EXISTS public.ai_master_prompt (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt TEXT NOT NULL DEFAULT 'Você é um assistente de agendamentos profissional e prestativo. Sempre mantenha um tom cordial e ajude o cliente da melhor forma possível.',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Inserir prompt padrão inicial
INSERT INTO public.ai_master_prompt (prompt)
VALUES ('Você é um assistente de agendamentos profissional e prestativo. Sempre mantenha um tom cordial e ajude o cliente da melhor forma possível.')
ON CONFLICT DO NOTHING;

-- Habilitar RLS na tabela ai_master_prompt
ALTER TABLE public.ai_master_prompt ENABLE ROW LEVEL SECURITY;

-- Policy: Apenas superusers podem ler e editar o prompt master
CREATE POLICY "Superuser can manage master prompt"
ON public.ai_master_prompt
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'superuser'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'superuser'::app_role));

-- Comentários para documentação
COMMENT ON TABLE public.ai_master_prompt IS 'Armazena o prompt master global que define regras gerais para todas as IAs do sistema';
COMMENT ON COLUMN public.whatsapp_messages.transcription_text IS 'Texto transcrito de mensagens de áudio via Whisper';
COMMENT ON COLUMN public.whatsapp_messages.media_url IS 'URL de imagens ou outros arquivos de mídia';
COMMENT ON COLUMN public.whatsapp_messages.media_type IS 'Tipo de mídia: audio, image, video, document';
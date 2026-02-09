-- Remover mensagens duplicadas mantendo apenas a mais antiga de cada message_id por conexão
DELETE FROM whatsapp_messages 
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY whatsapp_connection_id, message_id 
      ORDER BY created_at ASC
    ) as rn
    FROM whatsapp_messages
    WHERE message_id IS NOT NULL
  ) subq
  WHERE rn > 1
);

-- Adicionar constraint UNIQUE para prevenir duplicatas futuras
ALTER TABLE whatsapp_messages 
ADD CONSTRAINT unique_message_id_per_connection 
UNIQUE (whatsapp_connection_id, message_id);
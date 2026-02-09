-- Adicionar campos para dados completos do contato vindos da Z-API
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_push_name TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_about TEXT;

COMMENT ON COLUMN contacts.profile_picture_url IS 'URL da foto de perfil do WhatsApp';
COMMENT ON COLUMN contacts.whatsapp_push_name IS 'Nome de exibição (push name) do WhatsApp';
COMMENT ON COLUMN contacts.whatsapp_about IS 'Status/About do perfil do WhatsApp';
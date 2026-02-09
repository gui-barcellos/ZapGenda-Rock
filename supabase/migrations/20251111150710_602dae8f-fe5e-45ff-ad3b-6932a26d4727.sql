-- Adiciona política RLS para permitir superusers gerenciarem conexões WhatsApp de qualquer empresa
CREATE POLICY "Superuser whatsapp connections" ON whatsapp_connections 
FOR ALL TO authenticated 
USING (has_role(auth.uid(), 'superuser'::app_role)) 
WITH CHECK (has_role(auth.uid(), 'superuser'::app_role));
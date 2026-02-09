-- Passo 1: Remover temporariamente o constraint UNIQUE
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_company_id_phone_key;

-- Passo 2: Criar tabela temporária com TODOS os contatos agrupados por phone normalizado
CREATE TEMP TABLE contact_merge_map AS
WITH all_contacts_normalized AS (
  SELECT 
    id,
    company_id,
    phone,
    regexp_replace(phone, '[^0-9]', '', 'g') as normalized_phone,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY company_id, regexp_replace(phone, '[^0-9]', '', 'g') 
      ORDER BY created_at ASC
    ) as rn
  FROM contacts
)
SELECT 
  old_contact.id as old_id,
  keeper.id as new_id
FROM all_contacts_normalized old_contact
JOIN all_contacts_normalized keeper 
  ON old_contact.company_id = keeper.company_id 
  AND old_contact.normalized_phone = keeper.normalized_phone
  AND keeper.rn = 1 -- contato mais antigo
WHERE old_contact.rn > 1; -- contatos duplicados

-- Passo 3: Atualizar referências em conversations
UPDATE conversations 
SET contact_id = map.new_id
FROM contact_merge_map map
WHERE conversations.contact_id = map.old_id;

-- Passo 4: Atualizar referências em whatsapp_messages
UPDATE whatsapp_messages 
SET contact_id = map.new_id
FROM contact_merge_map map
WHERE whatsapp_messages.contact_id = map.old_id;

-- Passo 5: Atualizar referências em appointments
UPDATE appointments 
SET contact_id = map.new_id
FROM contact_merge_map map
WHERE appointments.contact_id = map.old_id;

-- Passo 6: Atualizar referências em crm_history
UPDATE crm_history 
SET contact_id = map.new_id
FROM contact_merge_map map
WHERE crm_history.contact_id = map.old_id;

-- Passo 7: Deletar contatos duplicados
DELETE FROM contacts
WHERE id IN (SELECT old_id FROM contact_merge_map);

-- Passo 8: Normalizar todos os telefones em contacts
UPDATE contacts 
SET phone = regexp_replace(phone, '[^0-9]', '', 'g')
WHERE phone ~ '[^0-9]';

-- Passo 9: Normalizar todos os telefones em whatsapp_messages
UPDATE whatsapp_messages 
SET phone = regexp_replace(phone, '[^0-9]', '', 'g')
WHERE phone ~ '[^0-9]';

-- Passo 10: Recriar o constraint UNIQUE
ALTER TABLE contacts ADD CONSTRAINT contacts_company_id_phone_key UNIQUE (company_id, phone);
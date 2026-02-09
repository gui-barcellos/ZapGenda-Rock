-- Remover constraint, normalizar e remover duplicatas

ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_company_id_phone_key;

UPDATE contacts 
SET phone = CASE
  WHEN regexp_replace(phone, '[^0-9]', '', 'g') ~ '^55[0-9]{10,11}$' 
    THEN regexp_replace(phone, '[^0-9]', '', 'g')
  WHEN regexp_replace(phone, '[^0-9]', '', 'g') ~ '^[0-9]{10,11}$' 
    THEN '55' || regexp_replace(phone, '[^0-9]', '', 'g')
  ELSE regexp_replace(phone, '[^0-9]', '', 'g')
END;

UPDATE whatsapp_connections 
SET phone = CASE
  WHEN regexp_replace(phone, '[^0-9]', '', 'g') ~ '^55[0-9]{10,11}$' 
    THEN regexp_replace(phone, '[^0-9]', '', 'g')
  WHEN regexp_replace(phone, '[^0-9]', '', 'g') ~ '^[0-9]{10,11}$' 
    THEN '55' || regexp_replace(phone, '[^0-9]', '', 'g')
  ELSE regexp_replace(phone, '[^0-9]', '', 'g')
END
WHERE phone IS NOT NULL;

DELETE FROM contacts WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY company_id, phone ORDER BY created_at DESC) as rn
    FROM contacts
  ) t WHERE rn > 1
);

ALTER TABLE contacts ADD CONSTRAINT contacts_company_phone_unique UNIQUE (company_id, phone);
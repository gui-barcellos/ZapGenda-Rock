-- Criar função RPC para atualizar tags de contato de forma otimizada
CREATE OR REPLACE FUNCTION update_contact_tags(
  p_contact_id UUID,
  p_remove_tag TEXT,
  p_add_tag TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE contacts
  SET tags = (
    SELECT array_agg(DISTINCT tag)
    FROM unnest(
      COALESCE(tags, ARRAY[]::text[]) || ARRAY[p_add_tag]
    ) AS tag
    WHERE tag != p_remove_tag
  )
  WHERE id = p_contact_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
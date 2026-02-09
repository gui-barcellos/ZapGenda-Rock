
-- Adicionar tags de agendamento que estão faltando
INSERT INTO tag_registry (company_id, name, category, color, show_in_chat, is_system_tag, is_editable)
SELECT 
  company_id,
  tag_name,
  'Agendamento',
  tag_color,
  false,
  false,
  true
FROM (
  SELECT DISTINCT company_id FROM tag_registry
) companies
CROSS JOIN (
  VALUES 
    ('Confirmou', '#10b981'),
    ('Compareceu', '#22c55e'),
    ('Não Compareceu', '#ef4444')
) AS tags(tag_name, tag_color)
ON CONFLICT (company_id, name) DO NOTHING;

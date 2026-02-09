-- Remover funções não implementadas no chat-ai-responses
-- Estas funções estão no banco mas não têm handlers no código
DELETE FROM ai_action_definitions 
WHERE handler IN ('search_contact', 'create_contact', 'update_contact', 'add_tag', 'remove_tag');

-- Atualizar descrição do search_faq para indicar que está no prompt (não via function calling)
UPDATE ai_action_definitions 
SET description = 'FAQs são injetados diretamente no prompt da IA. Não usa function calling.',
    is_active = false,
    updated_at = NOW()
WHERE handler = 'search_faq';
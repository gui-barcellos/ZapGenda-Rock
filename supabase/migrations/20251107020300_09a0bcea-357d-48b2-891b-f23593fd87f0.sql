-- Add AI configuration fields to company_ai_settings
ALTER TABLE company_ai_settings 
ADD COLUMN IF NOT EXISTS ai_name TEXT DEFAULT 'Assistente Virtual',
ADD COLUMN IF NOT EXISTS ai_personality TEXT DEFAULT 'Sou uma assistente virtual profissional e atenciosa. Meu objetivo é ajudar com agendamentos de forma eficiente e amigável.',
ADD COLUMN IF NOT EXISTS greeting_message TEXT DEFAULT 'Olá! Sou a assistente virtual. Como posso ajudar você hoje?',
ADD COLUMN IF NOT EXISTS escalation_rules TEXT DEFAULT 'Acione "chamar humano" somente quando a conversa exigir empatia ou decisão fora das regras: reclamações, conflitos, erros, situações sensíveis, exceções de política, insistência após resposta clara ou pedido direto para falar com alguém. Também acione se houver elogio relevante que mereça atenção humana. Se o cliente fizer perguntas fora do escopo (ex: pedir algo que o local não oferece), apenas informe o que o local faz e siga normalmente. Nunca acione humano por dúvidas simples, curiosidade, confusão leve ou pedidos de desconto.',
ADD COLUMN IF NOT EXISTS escalation_tag TEXT DEFAULT 'Aguardando Humano',
ADD COLUMN IF NOT EXISTS urgency_rules TEXT DEFAULT 'Acione "urgente" apenas em casos de urgência real ou risco imediato: erro grave em andamento (como agendamento duplicado ou cobrança incorreta), cliente relatando dor, emergência física ou reação adversa, ameaça de cancelamento, reclamação pública ou conflito, ou cliente presente no local aguardando atendimento com problema. Use o alerta sonoro somente nesses casos. Nunca acione para dúvidas, insatisfações leves ou solicitações comuns.',
ADD COLUMN IF NOT EXISTS urgency_tag TEXT DEFAULT 'Urgente',
ADD COLUMN IF NOT EXISTS scheduling_mode TEXT DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS ask_preferred_day BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_next_slots INTEGER DEFAULT 3;
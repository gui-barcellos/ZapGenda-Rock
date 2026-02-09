
-- Adicionar colunas de configuração do modelo ao ai_master_prompt
ALTER TABLE public.ai_master_prompt 
ADD COLUMN IF NOT EXISTS model text DEFAULT 'gpt-5-nano-2025-08-07',
ADD COLUMN IF NOT EXISTS temperature numeric DEFAULT 0.7,
ADD COLUMN IF NOT EXISTS top_p numeric DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS max_tokens integer DEFAULT 1000;

-- Criar tabela para blocos de instrução (intenções)
CREATE TABLE IF NOT EXISTS public.ai_instruction_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  trigger_hashtag text NOT NULL UNIQUE,
  icon text DEFAULT 'FileText',
  instructions text NOT NULL DEFAULT '',
  description text,
  is_active boolean DEFAULT true,
  order_position integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Criar tabela para definições de ações do sistema
CREATE TABLE IF NOT EXISTS public.ai_action_definitions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_hashtag text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  parameters jsonb DEFAULT '[]'::jsonb,
  handler text NOT NULL,
  category text DEFAULT 'geral',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_instruction_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_action_definitions ENABLE ROW LEVEL SECURITY;

-- RLS policies - only superusers can manage
CREATE POLICY "Superuser ai_instruction_blocks" 
ON public.ai_instruction_blocks 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'superuser'::app_role))
WITH CHECK (has_role(auth.uid(), 'superuser'::app_role));

CREATE POLICY "Superuser ai_action_definitions" 
ON public.ai_action_definitions 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'superuser'::app_role))
WITH CHECK (has_role(auth.uid(), 'superuser'::app_role));

-- Inserir blocos de intenção padrão
INSERT INTO public.ai_instruction_blocks (name, slug, trigger_hashtag, icon, description, instructions, order_position) VALUES
('Agendamento', 'agendamento', '#agendar', 'Calendar', 'Quando o usuário deseja agendar um horário', 
'Você está no fluxo de AGENDAMENTO.

ETAPAS OBRIGATÓRIAS:
1. Pergunte com qual profissional deseja agendar
2. Pergunte qual serviço deseja
3. Pergunte a data de preferência
4. Use #buscar_horarios para verificar disponibilidade
5. Apresente os horários disponíveis
6. Confirme todos os dados antes de criar
7. Use #criar_agendamento para finalizar

VARIÁVEIS DISPONÍVEIS:
- {profissionais} - lista de profissionais ativos
- {servicos} - lista de serviços disponíveis

AÇÕES DISPONÍVEIS:
- #buscar_horarios|profissional:{id}|data:{YYYY-MM-DD}
- #criar_agendamento|profissional:{id}|servico:{id}|data:{YYYY-MM-DD}|hora:{HH:MM}|contato:{id}', 1),

('Cancelamento', 'cancelamento', '#cancelar', 'XCircle', 'Quando o usuário deseja cancelar um agendamento',
'Você está no fluxo de CANCELAMENTO.

ETAPAS OBRIGATÓRIAS:
1. Use #listar_agendamentos para ver os agendamentos do cliente
2. Se houver múltiplos, pergunte qual deseja cancelar
3. Confirme o cancelamento antes de executar
4. Use #cancelar_agendamento para finalizar

AÇÕES DISPONÍVEIS:
- #listar_agendamentos|contato:{id}
- #cancelar_agendamento|agendamento:{id}', 2),

('Consulta de Agendamento', 'consulta', '#consultar', 'Search', 'Quando o usuário deseja consultar seus agendamentos',
'Você está no fluxo de CONSULTA.

ETAPAS:
1. Use #listar_agendamentos para buscar os agendamentos
2. Informe os detalhes de forma clara e organizada

AÇÕES DISPONÍVEIS:
- #listar_agendamentos|contato:{id}', 3),

('Reagendamento', 'reagendamento', '#reagendar', 'CalendarClock', 'Quando o usuário deseja remarcar um agendamento',
'Você está no fluxo de REAGENDAMENTO.

ETAPAS OBRIGATÓRIAS:
1. Use #listar_agendamentos para ver os agendamentos
2. Identifique qual agendamento será remarcado
3. Pergunte a nova data/hora desejada
4. Use #buscar_horarios para verificar disponibilidade
5. Confirme a alteração
6. Use #reagendar_agendamento para finalizar

AÇÕES DISPONÍVEIS:
- #listar_agendamentos|contato:{id}
- #buscar_horarios|profissional:{id}|data:{YYYY-MM-DD}
- #reagendar_agendamento|agendamento:{id}|nova_data:{YYYY-MM-DD}|nova_hora:{HH:MM}', 4),

('Falar com Humano', 'humano', '#humano', 'UserRound', 'Quando o usuário solicita atendimento humano',
'O cliente solicitou falar com um humano.

AÇÃO IMEDIATA:
Use #escalar_humano para transferir o atendimento.

Informe ao cliente que um atendente irá assumir em breve.', 5),

('Informações', 'informacoes', '#informacoes', 'Info', 'Quando o usuário busca informações sobre a empresa',
'O cliente busca informações sobre a empresa.

DADOS DISPONÍVEIS:
- {empresa_nome} - nome da empresa
- {empresa_endereco} - endereço
- {empresa_telefone} - telefone
- {empresa_horarios} - horários de funcionamento
- {servicos} - serviços oferecidos
- {profissionais} - equipe

Responda de forma clara e objetiva.', 6),

('Dúvidas/FAQ', 'faq', '#faq', 'HelpCircle', 'Quando o usuário tem dúvidas gerais',
'O cliente tem uma dúvida.

Use #buscar_faq para encontrar respostas relevantes na base de conhecimento.

Se não encontrar resposta adequada, use #escalar_humano.

AÇÕES DISPONÍVEIS:
- #buscar_faq|pergunta:{texto}
- #escalar_humano', 7)

ON CONFLICT (trigger_hashtag) DO NOTHING;

-- Inserir ações padrão do sistema
INSERT INTO public.ai_action_definitions (action_hashtag, name, description, handler, category, parameters) VALUES
-- Ações de Agendamento
('#buscar_horarios', 'Buscar Horários Disponíveis', 'Consulta slots disponíveis para agendamento', 'check_availability', 'agendamento',
'[{"name": "profissional", "type": "uuid", "required": true}, {"name": "data", "type": "date", "required": true}, {"name": "servico", "type": "uuid", "required": false}]'),

('#criar_agendamento', 'Criar Agendamento', 'Cria um novo agendamento no sistema', 'create_appointment', 'agendamento',
'[{"name": "profissional", "type": "uuid", "required": true}, {"name": "servico", "type": "uuid", "required": true}, {"name": "data", "type": "date", "required": true}, {"name": "hora", "type": "time", "required": true}, {"name": "contato", "type": "uuid", "required": true}]'),

('#cancelar_agendamento', 'Cancelar Agendamento', 'Cancela um agendamento existente', 'cancel_appointment', 'agendamento',
'[{"name": "agendamento", "type": "uuid", "required": true}]'),

('#reagendar_agendamento', 'Reagendar Agendamento', 'Altera data/hora de um agendamento', 'reschedule_appointment', 'agendamento',
'[{"name": "agendamento", "type": "uuid", "required": true}, {"name": "nova_data", "type": "date", "required": true}, {"name": "nova_hora", "type": "time", "required": true}]'),

('#listar_agendamentos', 'Listar Agendamentos', 'Lista agendamentos de um contato', 'list_appointments', 'agendamento',
'[{"name": "contato", "type": "uuid", "required": true}]'),

-- Ações de Tags
('#tag_adicionar', 'Adicionar Tag', 'Adiciona uma tag ao contato', 'add_tag', 'tags',
'[{"name": "tag", "type": "string", "required": true}]'),

('#tag_remover', 'Remover Tag', 'Remove uma tag do contato', 'remove_tag', 'tags',
'[{"name": "tag", "type": "string", "required": true}]'),

-- Ações de Escalação
('#escalar_humano', 'Escalar para Humano', 'Transfere atendimento para humano', 'escalate_human', 'escalacao',
'[]'),

('#marcar_urgente', 'Marcar como Urgente', 'Marca a conversa como urgente', 'mark_urgent', 'escalacao',
'[]'),

-- Ações de Busca
('#buscar_faq', 'Buscar FAQ', 'Busca resposta na base de conhecimento', 'search_faq', 'busca',
'[{"name": "pergunta", "type": "string", "required": true}]'),

('#buscar_contato', 'Buscar Contato', 'Busca contato por nome', 'search_contact', 'busca',
'[{"name": "nome", "type": "string", "required": true}]'),

-- Ações de Contato
('#criar_contato', 'Criar Contato', 'Cria novo contato', 'create_contact', 'contato',
'[{"name": "nome", "type": "string", "required": true}, {"name": "telefone", "type": "string", "required": true}]'),

('#atualizar_contato', 'Atualizar Contato', 'Atualiza dados do contato', 'update_contact', 'contato',
'[{"name": "campo", "type": "string", "required": true}, {"name": "valor", "type": "string", "required": true}]')

ON CONFLICT (action_hashtag) DO NOTHING;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_ai_blocks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_instruction_blocks_updated_at
BEFORE UPDATE ON public.ai_instruction_blocks
FOR EACH ROW EXECUTE FUNCTION update_ai_blocks_updated_at();

CREATE TRIGGER update_ai_action_definitions_updated_at
BEFORE UPDATE ON public.ai_action_definitions
FOR EACH ROW EXECUTE FUNCTION update_ai_blocks_updated_at();

-- Atualizar descrições das funções para serem mais detalhadas e contextuais
-- Essas descrições serão usadas pelo function calling para decidir quando chamar cada função

UPDATE ai_action_definitions
SET description = 'Cancela um agendamento existente do cliente. Use quando o cliente disser que quer cancelar, desmarcar, ou não vai poder comparecer. Se houver múltiplos agendamentos, liste-os primeiro com list_appointments para o cliente escolher qual cancelar.',
    updated_at = now()
WHERE handler = 'cancel_appointment';

UPDATE ai_action_definitions
SET description = 'Lista todos os agendamentos futuros do cliente. Use quando o cliente perguntar sobre seus agendamentos, quiser saber quando é a próxima consulta, ou antes de cancelar/reagendar para mostrar as opções disponíveis. Também use quando precisar identificar qual agendamento o cliente quer modificar.',
    updated_at = now()
WHERE handler = 'list_appointments';

UPDATE ai_action_definitions
SET description = 'Altera a data e/ou horário de um agendamento existente. Use quando o cliente quiser remarcar, mudar a data, trocar o horário, ou adiantar/adiar um agendamento. Primeiro liste os agendamentos se necessário, depois use check_availability para encontrar novos horários disponíveis.',
    updated_at = now()
WHERE handler = 'reschedule_appointment';

UPDATE ai_action_definitions
SET description = 'Transfere o atendimento para um atendente humano. Use quando: (1) não conseguir resolver a solicitação do cliente, (2) o cliente pedir expressamente para falar com uma pessoa, (3) houver reclamação ou situação delicada, (4) assunto estiver fora do escopo de agendamento, (5) cliente parecer frustrado com o atendimento automático.',
    updated_at = now()
WHERE handler = 'escalate_human';

UPDATE ai_action_definitions
SET description = 'Sinaliza a conversa como urgente para priorização imediata pela equipe. Use APENAS em casos de: (1) emergência médica ou de saúde relatada pelo cliente, (2) problema grave em andamento que precisa de atenção imediata, (3) cliente muito insatisfeito ou em situação de risco, (4) situação que requer intervenção urgente da equipe.',
    updated_at = now()
WHERE handler = 'mark_urgent';

UPDATE ai_action_definitions
SET description = 'Obtém informações gerais da empresa: endereço, telefone, horários de funcionamento, formas de pagamento, localização. Use quando o cliente perguntar onde fica a clínica, como chegar, qual o telefone, horário de atendimento, se aceita cartão, se tem estacionamento, etc.',
    updated_at = now()
WHERE handler = 'get_company_info';

UPDATE ai_action_definitions
SET description = 'Busca respostas em perguntas frequentes cadastradas pela empresa. Use quando o cliente fizer uma pergunta que não seja sobre agendamento, como: valores de procedimentos, preparação para exames, documentos necessários, convênios aceitos, etc. Só chame quando realmente houver uma pergunta informativa.',
    updated_at = now()
WHERE handler = 'search_faq';
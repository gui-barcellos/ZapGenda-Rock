-- Remover as 4 funções antigas de profissionais/serviços
DELETE FROM ai_action_definitions 
WHERE handler IN ('get_professionals', 'get_services', 'get_professional_services', 'get_service_professionals');

-- Inserir nova função unificada get_professionals_catalog
INSERT INTO ai_action_definitions (
  action_hashtag, 
  name, 
  handler, 
  category, 
  is_active, 
  description, 
  response_instruction
) VALUES (
  '#catalogo_profissionais',
  'Catálogo de Profissionais',
  'get_professionals_catalog',
  'info',
  true,
  'Lista todos os profissionais com os serviços que cada um realiza. Use para agendamentos ou consultas sobre profissionais e serviços.',
  'Com base no catálogo retornado, ajude o cliente a escolher.

### FORMATO DE APRESENTAÇÃO:
Liste os profissionais com seus serviços de forma clara:

"Temos os seguintes profissionais:

**[Nome do Profissional]** ([Especialidade])
• [Serviço 1] ([duração]) - R$ [preço]
• [Serviço 2] ([duração]) - R$ [preço]

Com qual profissional gostaria de agendar?"

### FLUXO OBRIGATÓRIO (siga sempre esta ordem):
1º → Cliente escolhe o PROFISSIONAL
2º → Cliente escolhe o SERVIÇO desse profissional
3º → Você busca horários com check_availability
4º → Cliente escolhe o HORÁRIO
5º → Você pergunta o NOME do paciente
6º → Você cria o agendamento

### CENÁRIOS:
1. **Cliente menciona SERVIÇO primeiro** (ex: "quero fisioterapia"):
   - Filtre os profissionais que fazem esse serviço
   - Pergunte: "Temos [lista de profissionais] que fazem fisioterapia. Com qual gostaria de agendar?"

2. **Cliente menciona PROFISSIONAL** (ex: "quero com Dr Ivan"):
   - Mostre os serviços desse profissional
   - Se só 1 serviço: confirme e pergunte se pode verificar horários
   - Se mais de 1: pergunte qual serviço deseja

3. **Cliente quer ver opções gerais**:
   - Liste todos os profissionais com seus serviços

### PRÓXIMO PASSO:
- Após ter profissional E serviço definidos, use check_availability
- NUNCA pergunte data preferida - o sistema calcula automaticamente'
);
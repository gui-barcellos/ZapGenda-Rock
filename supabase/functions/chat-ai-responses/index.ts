import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FALLBACK_MESSAGE = 'Desculpe! No momento estamos com instabilidade. Um atendente humano te responde em breve. ðŸ™';

// ==================== TIPOS ====================

interface ConfirmedFact {
  type: 'professional_selected' | 'service_selected' | 'date_selected' | 'time_selected' | 'appointment_created' | 'appointment_confirmed' | 'appointment_cancelled' | 'appointment_rescheduled';
  value: string;
  id?: string;
  appointment_id?: string;
  timestamp: string;
}

interface ConversationState {
  id: string;
  conversation_id: string;
  company_id: string;
  stage: 'idle' | 'scheduling' | 'canceling' | 'rescheduling' | 'consulting';
  collected_data: Record<string, any>;
  confirmed_facts: ConfirmedFact[];
  has_previous_appointment: boolean;
  has_active_appointment: boolean;
  pending_action: string | null;
  expires_at: string;
  last_response_id: string | null; // MemÃ³ria nativa da Responses API
}

interface AllowedActionsResult {
  allowedActions: string[];
  requiredFields: string[];
  contextMessage: string;
}

interface FunctionCallLog {
  name: string;
  args: any;
  result: any;
  timestamp: string;
}

interface LogData {
  companyId: string;
  contactId: string | null;
  conversationId: string;
  userMessage: string;
  isFirstMessage: boolean;
  previousResponseId: string | null;
  responseIdGenerated: string | null;
  systemPromptUsed: string | null;
  functionCalls: FunctionCallLog[];
  finalResponse: string;
  tokensInput: number;
  tokensOutput: number;
  tokensTotal: number;
  modelUsed: string;
  responseTimeMs: number;
  conversationStage: string;
  confirmedFacts: ConfirmedFact[];
  loopIterations: number;
}

// ==================== HELPERS PARA CONFIRMED_FACTS ====================

function addConfirmedFact(
  currentFacts: ConfirmedFact[],
  type: ConfirmedFact['type'],
  value: string,
  metadata?: { id?: string; appointment_id?: string }
): ConfirmedFact[] {
  return [
    ...currentFacts,
    {
      type,
      value,
      ...metadata,
      timestamp: new Date().toISOString()
    }
  ];
}

function formatConfirmedFacts(facts: ConfirmedFact[]): string {
  if (!facts || facts.length === 0) return 'Nenhum fato confirmado ainda.';
  return facts.map(f => `- ${f.type}: ${f.value}`).join('\n');
}

// ==================== SUBSTITUIÃ‡ÃƒO DE VARIÃVEIS (PROMPT SAGRADO) ====================

function substituirVariaveis(prompt: string, vars: Record<string, string>): string {
  let result = prompt;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '');
  }
  return result;
}

// ==================== INTENT PARSER (EXPLICIT ACTIONS) ====================

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectIntent(message: string) {
  const text = normalizeText(message);

  const cancelPatterns = [
    'cancel', 'cancelar', 'cancela', 'desmarc', 'nao vou', 'nao posso', 'nao consigo ir',
    'preciso cancelar', 'quero cancelar'
  ];
  const reschedulePatterns = [
    'reagend', 'remarc', 'trocar horario', 'mudar horario', 'outro horario', 'outro dia', 'adiar'
  ];
  const confirmPatterns = [
    'confirm', 'sim', 'ok', 'certo', 'pode ser', 'fechado'
  ];

  const hasAny = (patterns: string[]) => patterns.some((p) => text.includes(p));

  const cancel = hasAny(cancelPatterns);
  const reschedule = hasAny(reschedulePatterns);
  const confirm = hasAny(confirmPatterns) && !cancel && !reschedule;
  const cancelConfirm = /\bcancel(ar|a|e)?\b/.test(text);

  return { cancel, reschedule, confirm, cancelConfirm, text };
}
// ==================== DEFINIÃ‡ÃƒO DE TOOLS ====================

const ALL_TOOLS: Record<string, any> = {
  // ==================== INFORMAÃ‡ÃƒO (SOB DEMANDA) ====================
  get_company_info: {
    type: "function",
    name: "get_company_info",
    description: "ObtÃ©m informaÃ§Ãµes da empresa (endereÃ§o, telefone, horÃ¡rio de funcionamento). Use quando cliente perguntar onde fica, contato, localizaÃ§Ã£o, etc.",
    parameters: { type: "object", properties: {}, required: [] }
  },
  get_professionals_catalog: {
    type: "function",
    name: "get_professionals_catalog",
    description: "Lista todos os profissionais com os serviÃ§os que cada um realiza. Use quando cliente quiser agendar, perguntar sobre profissionais, serviÃ§os, ou procedimentos. IMPORTANTE: O fluxo de agendamento Ã© SEMPRE: 1Âº escolher profissional, 2Âº escolher serviÃ§o, 3Âº escolher horÃ¡rio.",
    parameters: { type: "object", properties: {}, required: [] }
  },

  // ==================== AGENDAMENTO ====================
  check_availability: {
    type: "function",
    name: "check_availability",
    description: "Consulta os prÃ³ximos horÃ¡rios disponÃ­veis baseado nas regras de agendamento da empresa. Use DEPOIS de coletar profissional e serviÃ§o. NÃƒO pergunte a data preferida - o sistema calcula automaticamente.",
    parameters: {
      type: "object",
      properties: {
        professional_id: { type: "string", description: "ID do profissional (obrigatÃ³rio)" },
        service_id: { type: "string", description: "ID do serviÃ§o (obrigatÃ³rio)" }
      },
      required: ["professional_id", "service_id"]
    }
  },
  create_appointment: {
    type: "function",
    name: "create_appointment",
    description: "Cria o agendamento final. Use DEPOIS de ter: profissional, serviÃ§o, horÃ¡rio escolhido pelo cliente, e NOME do paciente. SEMPRE pergunte o nome do paciente antes de criar o agendamento.",
    parameters: {
      type: "object",
      properties: {
        professional_id: { type: "string", description: "ID do profissional" },
        service_id: { type: "string", description: "ID do serviÃ§o" },
        date: { type: "string", description: "Data YYYY-MM-DD" },
        start_time: { type: "string", description: "HorÃ¡rio HH:MM" },
        patient_name: { type: "string", description: "Nome completo do paciente/cliente que serÃ¡ atendido" }
      },
      required: ["professional_id", "service_id", "date", "start_time", "patient_name"]
    }
  },
  cancel_appointment: {
    type: "function",
    name: "cancel_appointment",
    description: "Cancela um agendamento existente",
    parameters: {
      type: "object",
      properties: {
        appointment_id: { type: "string", description: "ID do agendamento (opcional se tiver apenas um)" },
        reason: { type: "string", description: "Motivo do cancelamento" }
      },
      required: []
    }
  },
  list_appointments: {
    type: "function",
    name: "list_appointments",
    description: "Lista os agendamentos do cliente",
    parameters: {
      type: "object",
      properties: {
        include_past: { type: "boolean", description: "Incluir agendamentos passados" }
      },
      required: []
    }
  },
  reschedule_appointment: {
    type: "function",
    name: "reschedule_appointment",
    description: "Reagenda um agendamento para nova data/hora",
    parameters: {
      type: "object",
      properties: {
        appointment_id: { type: "string", description: "ID do agendamento" },
        new_date: { type: "string", description: "Nova data YYYY-MM-DD" },
        new_start_time: { type: "string", description: "Novo horÃ¡rio HH:MM" }
      },
      required: ["new_date", "new_start_time"]
    }
  },
  escalate_to_human: {
    type: "function",
    name: "escalate_to_human",
    description: "Transfere o atendimento para um humano. Use quando nÃ£o conseguir ajudar ou cliente pedir.",
    parameters: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Motivo da escalaÃ§Ã£o" }
      },
      required: []
    }
  },
  mark_urgent: {
    type: "function",
    name: "mark_urgent",
    description: "Marca a conversa como urgente. Use em casos de urgÃªncia real ou risco imediato.",
    parameters: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Motivo da urgÃªncia" }
      },
      required: []
    }
  }
};

// ==================== MOTOR DE DECISÃƒO (BACKEND ORQUESTRADOR) ====================

// Info actions estÃ£o SEMPRE disponÃ­veis - IA decide quando precisa
const INFO_ACTIONS = [
  'get_company_info',
  'get_professionals_catalog'
];

function determineAllowedActions(state: ConversationState): AllowedActionsResult {
  const { stage, collected_data, has_active_appointment, pending_action } = state;

  // Info actions sempre disponÃ­veis + escalaÃ§Ã£o + urgÃªncia
  const baseActions = [...INFO_ACTIONS, 'escalate_to_human', 'mark_urgent'];

  switch (stage) {
    case 'idle':
      const actions = [...baseActions, 'check_availability', 'list_appointments'];
      if (has_active_appointment) {
        actions.push('cancel_appointment', 'reschedule_appointment');
      }
      return {
        allowedActions: actions,
        requiredFields: [],
        contextMessage: 'Aguardando aÃ§Ã£o do cliente.'
      };

    case 'scheduling':
      // Ordem de coleta: 1) professional_id, 2) service_id, 3) selected_slot (date+time), 4) patient_name
      const schedulingRequired = ['professional_id', 'service_id', 'selected_slot', 'patient_name'];
      const schedulingMissing = schedulingRequired.filter(f => !collected_data[f]);
      
      if (schedulingMissing.length === 0) {
        return {
          allowedActions: [...baseActions, 'create_appointment', 'check_availability'],
          requiredFields: [],
          contextMessage: 'Dados completos. Aguardando confirmaÃ§Ã£o do cliente para criar agendamento.'
        };
      }
      
      // Se falta selected_slot, pode consultar disponibilidade
      // Se falta patient_name, precisa perguntar o nome
      return {
        allowedActions: [...baseActions, 'check_availability'],
        requiredFields: schedulingMissing,
        contextMessage: `Coletando dados para agendamento. Faltam: ${schedulingMissing.join(', ')}`
      };

    case 'consulting':
      return {
        allowedActions: [...baseActions, 'list_appointments', 'check_availability', 'cancel_appointment', 'reschedule_appointment'],
        requiredFields: [],
        contextMessage: 'Cliente consultando agendamentos.'
      };

    case 'canceling': {
      const allowCancel = pending_action === 'cancel_confirmed';
      const actions = allowCancel
        ? [...baseActions, 'list_appointments', 'cancel_appointment']
        : [...baseActions, 'list_appointments'];
      return {
        allowedActions: actions,
        requiredFields: has_active_appointment ? [] : ['appointment_id'],
        contextMessage: allowCancel
          ? 'Cliente confirmou cancelamento.'
          : 'Cliente quer cancelar agendamento. Pergunte se prefere reagendar ou cancelar.'
      };
    }

    case 'rescheduling':
      const reschedMissing = ['new_date', 'new_start_time'].filter(f => !collected_data[f]);
      return {
        allowedActions: [...baseActions, 'list_appointments', 'reschedule_appointment', 'check_availability'],
        requiredFields: reschedMissing,
        contextMessage: `Reagendando. Faltam: ${reschedMissing.length > 0 ? reschedMissing.join(', ') : 'nenhum'}`
      };

    default:
      return {
        allowedActions: baseActions,
        requiredFields: [],
        contextMessage: 'Estado desconhecido.'
      };
  }
}

// ==================== MONTAGEM DINÃ‚MICA DE TOOLS ====================

function buildDynamicTools(allowedActions: string[], descriptionOverrides?: Record<string, string>): any[] {
  return allowedActions
    .filter(action => ALL_TOOLS[action])
    .map(action => {
      const tool = JSON.parse(JSON.stringify(ALL_TOOLS[action])); // Deep clone
      if (descriptionOverrides?.[action]) {
        tool.description = descriptionOverrides[action];
      }
      return tool;
    });
}

async function confirmUpcomingAppointment(
  supabase: any,
  companyId: string,
  contactId: string
) {
  const today = new Date().toISOString().split('T')[0];
  const { data: appointment } = await supabase
    .from('appointments')
    .select('id, date, start_time, status, professionals(name), services(name), confirmation_sent_at')
    .eq('contact_id', contactId)
    .eq('company_id', companyId)
    .gte('date', today)
    .eq('status', 'scheduled')
    .not('confirmation_sent_at', 'is', null)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!appointment?.id) return null;

  await supabase
    .from('appointments')
    .update({ status: 'confirmed' })
    .eq('id', appointment.id);

  return {
    id: appointment.id,
    date: appointment.date,
    time: appointment.start_time,
    professional: appointment.professionals?.name || null,
    service: appointment.services?.name || null,
  };
}

// ==================== MEMÃ“RIA NATIVA - getConversationHistory REMOVIDO ====================
// OpenAI armazena todo o histÃ³rico via previous_response_id - nÃ£o precisamos mais buscar do banco!

// ==================== SERVE ====================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const startTime = Date.now();
    const { message, companyId, contactId, conversationId, senderPhone } = await req.json();

    if (!companyId || !message) {
      return new Response(JSON.stringify({ error: 'companyId and message required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('ðŸ¤– ==================== CHAT-AI-RESPONSES (100% Function Calling) ====================');
    console.log('ðŸ“© Mensagem:', message.substring(0, 100));
    console.log('ðŸ¢ Company:', companyId);
    console.log('ðŸ‘¤ Contact:', contactId);

    // ==================== 1. CARREGAR DADOS MÃNIMOS (sem professionals/services) ====================
    const [
      { data: aiConfig },
      { data: company },
      { data: companySettings },
      { data: keyData },
      { data: contactData },
      { data: masterPromptData },
      { data: actionDefinitions },
      { data: companyFaqs }
    ] = await Promise.all([
      supabase.from('company_ai_settings').select('ai_name, greeting_message, greeting_show_always, greeting_time_based, ai_instructions, escalation_rules, urgency_rules, show_next_slots').eq('company_id', companyId).single(),
      supabase.from('companies').select('name').eq('id', companyId).single(),
      supabase.from('company_settings').select('timezone, language').eq('company_id', companyId).single(),
      supabase.from('openai_settings').select('api_key').order('updated_at', { ascending: false }).limit(1).single(),
      contactId ? supabase.from('contacts').select('id, name, phone, tags').eq('id', contactId).maybeSingle() : Promise.resolve({ data: null }),
      supabase.from('ai_master_prompt').select('prompt, model, temperature, top_p, max_tokens, context_window, state_expiration_minutes').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('ai_action_definitions').select('handler, description, response_instruction').eq('is_active', true),
      supabase.from('company_faqs').select('question, answer, summary').eq('company_id', companyId).eq('is_active', true).order('created_at', { ascending: true })
    ]);

    if (!keyData?.api_key) {
      throw new Error('OpenAI API key not configured');
    }

    // Build maps for response_instruction and description overrides
    const responseInstructions: Record<string, string> = {};
    const descriptionOverrides: Record<string, string> = {};
    if (actionDefinitions) {
      for (const def of actionDefinitions) {
        if (def.response_instruction) {
          responseInstructions[def.handler] = def.response_instruction;
        }
        if (def.description) {
          descriptionOverrides[def.handler] = def.description;
        }
      }
    }
    console.log('ðŸ“‹ Response instructions loaded:', Object.keys(responseInstructions));
    console.log('ðŸ“– Description overrides loaded:', Object.keys(descriptionOverrides));

    const model = masterPromptData?.model || 'gpt-5';
    const contextWindow = masterPromptData?.context_window || 20;
    const maxTokens = masterPromptData?.max_tokens || 4000;
    const temperature = masterPromptData?.temperature;
    const topP = masterPromptData?.top_p;
    const expirationMinutes = masterPromptData?.state_expiration_minutes || 30;

    console.log('âš™ï¸ Config:', { model, contextWindow, maxTokens });

    // ==================== 2. CARREGAR/CRIAR ESTADO DA CONVERSA ====================
    let state: ConversationState;
    
    const { data: existingState } = await supabase
      .from('conversation_state')
      .select('*')
      .eq('conversation_id', conversationId)
      .maybeSingle();

    // Flag para detectar se estado expirou (para injetar instruÃ§Ã£o no prompt)
    let stateExpired = false;
    
    if (existingState) {
      if (new Date(existingState.expires_at) < new Date()) {
        // âœ… PRESERVAR last_response_id para manter memÃ³ria da conversa
        // Apenas resetar dados parciais de agendamento, nÃ£o a memÃ³ria!
        console.log('â° Estado expirado, resetando stage mas PRESERVANDO memÃ³ria da conversa');
        console.log('   last_response_id preservado:', existingState.last_response_id?.substring(0, 30));
        
        const newExpiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000).toISOString();
        
        state = {
          ...existingState,
          stage: 'idle',
          collected_data: {},
          confirmed_facts: [],
          pending_action: null,
          expires_at: newExpiresAt
          // âœ… NÃƒO limpamos last_response_id! MantÃ©m a memÃ³ria
        };
        stateExpired = true; // Flag para injetar instruÃ§Ã£o no prompt
      } else {
        state = {
          ...existingState,
          confirmed_facts: existingState.confirmed_facts || [],
          last_response_id: existingState.last_response_id || null
        } as ConversationState;
      }
    } else {
      const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000).toISOString();
      
      const { data: newState } = await supabase
        .from('conversation_state')
        .insert({
          conversation_id: conversationId,
          company_id: companyId,
          stage: 'idle',
          collected_data: {},
          confirmed_facts: [],
          expires_at: expiresAt,
          last_response_id: null
        })
        .select()
        .single();
      
      state = { ...newState, confirmed_facts: [], last_response_id: null } as ConversationState;
    }

    // ==================== 3. CALCULAR FLAGS DETERMINÃSTICAS ====================
    const today = new Date().toISOString().split('T')[0];
    
    const { data: activeAppointments } = await supabase
      .from('appointments')
      .select('id')
      .eq('contact_id', contactId)
      .eq('company_id', companyId)
      .gte('date', today)
      .in('status', ['scheduled', 'confirmed'])
      .limit(1);

    const { data: pastAppointments } = await supabase
      .from('appointments')
      .select('id')
      .eq('contact_id', contactId)
      .eq('company_id', companyId)
      .limit(1);

    state.has_active_appointment = (activeAppointments?.length || 0) > 0;
    state.has_previous_appointment = (pastAppointments?.length || 0) > 0;

    console.log('ðŸ“Š Estado atual:', {
      stage: state.stage,
      hasActive: state.has_active_appointment,
      hasPrevious: state.has_previous_appointment,
      collectedData: Object.keys(state.collected_data),
      confirmedFacts: state.confirmed_facts.length,
      stateExpired
    });

    // ==================== 3.25. DETECTAR INTENÃ‡ÃƒO EXPLÃ�CITA ====================
    const intent = detectIntent(message);
    let newPendingAction = state.pending_action;
    let confirmationInstruction = '';
    let confirmedAppointment: { id: string; date: string; time: string; professional: string | null; service: string | null } | null = null;

    if (intent.cancel) {
      state.stage = 'canceling';
      if (state.pending_action === 'cancel_requested' && intent.cancelConfirm) {
        newPendingAction = 'cancel_confirmed';
      } else {
        newPendingAction = 'cancel_requested';
      }
    } else if (intent.reschedule) {
      state.stage = 'rescheduling';
      newPendingAction = 'reschedule_requested';
    }

    state.pending_action = newPendingAction;

    if (contactId && intent.confirm && state.stage === 'idle' && !state.pending_action) {
      confirmedAppointment = await confirmUpcomingAppointment(supabase, companyId, contactId);
      if (confirmedAppointment?.id) {
        confirmationInstruction = `\n\n[CONFIRMAÇÃO DE AGENDAMENTO]
O cliente CONFIRMOU presença. Responda confirmando a consulta e não peça confirmação novamente.
Dados do agendamento: ${confirmedAppointment.date} às ${confirmedAppointment.time}${confirmedAppointment.professional ? ` com ${confirmedAppointment.professional}` : ''}${confirmedAppointment.service ? ` (${confirmedAppointment.service})` : ''}.`;
      }
    }

    // ==================== 3.5. BUSCAR PROMPT INJECTION DE ESTADO EXPIRADO ====================
    let stateExpiredMessage = '';
    if (stateExpired) {
      const { data: expiredPrompt } = await supabase
        .from('ai_prompt_injections')
        .select('content')
        .eq('key', 'state_expired')
        .eq('is_active', true)
        .single();
      
      stateExpiredMessage = expiredPrompt?.content || 
        'O tempo limite para o agendamento expirou. Se o cliente quiser continuar, vocÃª precisa consultar novamente os horÃ¡rios disponÃ­veis usando check_availability.';
      
      console.log('ðŸ“ Prompt de estado expirado carregado:', stateExpiredMessage.substring(0, 50) + '...');
    }

    // ==================== 4. BACKEND DECIDE AÃ‡Ã•ES PERMITIDAS ====================
    const { allowedActions, requiredFields, contextMessage } = determineAllowedActions(state);
    
    console.log('ðŸŽ¯ Backend decidiu:', {
      allowedActions,
      requiredFields,
      contextMessage
    });

    // ==================== 5. MONTAR TOOLS DINÃ‚MICOS COM OVERRIDES DE DESCRIÃ‡ÃƒO ====================
    // Adiciona overrides especÃ­ficos da empresa por cima das descriÃ§Ãµes do banco
    if (aiConfig?.escalation_rules) {
      descriptionOverrides['escalate_to_human'] = aiConfig.escalation_rules;
    }
    if (aiConfig?.urgency_rules) {
      descriptionOverrides['mark_urgent'] = aiConfig.urgency_rules;
    }
    const tools = buildDynamicTools(allowedActions, descriptionOverrides);

    // ==================== 6. MEMÃ“RIA NATIVA - SEM HISTÃ“RICO MANUAL ====================
    // OpenAI armazena todo o contexto via previous_response_id
    const isFirstMessage = !state.last_response_id;
    console.log(`ðŸ§  MemÃ³ria nativa: ${isFirstMessage ? 'PRIMEIRA MENSAGEM' : 'ENCADEANDO via previous_response_id'}`);

    // ==================== 7. MONTAR SYSTEM PROMPT (SAGRADO - SÃ“ VARIÃVEIS) ====================
    const timeZone = companySettings?.timezone || 'America/Sao_Paulo';
    const locale = companySettings?.language || 'pt-BR';
    const horaAtual = new Date().toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', timeZone });
    const dataAtual = new Date().toLocaleDateString(locale, { timeZone });

    // Verificar se Ã© primeiro contato (para saudaÃ§Ã£o)
    let greetingInstruction = '';
    if (isFirstMessage && aiConfig?.greeting_message) {
      // Determinar cumprimento baseado na hora (timezone Brasil) - sempre calcula
      const brHour = new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone });
      const hour = parseInt(brHour, 10);
      let cumprimento = '';
      if (hour >= 5 && hour < 12) cumprimento = 'Bom dia';
      else if (hour >= 12 && hour < 18) cumprimento = 'Boa tarde';
      else cumprimento = 'Boa noite';
      
      // Substituir variÃ¡veis na mensagem de boas-vindas (incluindo {cumprimento})
      const greetingWithVars = substituirVariaveis(aiConfig.greeting_message, {
        cumprimento,
        empresa: company?.name || 'Empresa',
        nome_cliente: contactData?.name || 'Cliente',
        nome_assistente: aiConfig?.ai_name || 'Assistente'
      });
      
      greetingInstruction = `\n\n[PRIMEIRO CONTATO DO CLIENTE - INSTRUÃ‡ÃƒO ÃšNICA]
Esta Ã© a PRIMEIRA mensagem do cliente. Comportamento baseado no contexto:

1. Se a mensagem do cliente Ã© APENAS um cumprimento (ex: "Oi", "OlÃ¡", "Bom dia", "Boa tarde"):
   - Responda com a saudaÃ§Ã£o completa: "${greetingWithVars}"

2. Se a mensagem do cliente CONTÃ‰M UMA PERGUNTA ou solicitaÃ§Ã£o especÃ­fica:
   - Cumprimente brevemente: "${cumprimento}, ${contactData?.name || 'Cliente'}!"
   - Se apresente uma vez: "Sou ${aiConfig?.ai_name || 'Assistente'}, da ${company?.name || 'Empresa'}."
   - E responda DIRETAMENTE Ã  pergunta/solicitaÃ§Ã£o do cliente (sem perguntar "como posso ajudar")

IMPORTANTE: Nas prÃ³ximas mensagens desta conversa, NÃƒO inclua saudaÃ§Ã£o ou apresentaÃ§Ã£o novamente - ela jÃ¡ foi feita.`;
    }

    // Adicionar instruÃ§Ãµes adicionais se existirem
    const additionalInstructions = aiConfig?.ai_instructions?.trim()
      ? `\n\n[INSTRUÃ‡Ã•ES ADICIONAIS]\n${aiConfig.ai_instructions}`
      : '';

    // InstruÃ§Ã£o de estado expirado (se aplicÃ¡vel)
    const stateExpiredInstruction = stateExpired
      ? `\n\nâš ï¸ [ATENÃ‡ÃƒO - ESTADO DE AGENDAMENTO EXPIRADO]
${stateExpiredMessage}

IMPORTANTE: 
- Os horÃ¡rios que vocÃª mostrou anteriormente podem NÃƒO estar mais disponÃ­veis.
- Se o cliente quiser continuar agendando, vocÃª DEVE chamar check_availability novamente ANTES de confirmar qualquer horÃ¡rio.
- VocÃª ainda lembra de toda a conversa anterior, use esse contexto para ajudar o cliente.
- Seja natural e acolhedor - nÃ£o precisa mencionar que "expirou", apenas diga algo como "Deixa eu verificar os horÃ¡rios atualizados para vocÃª".`
      : '';

    // ==================== FAQ - BASE DE CONHECIMENTO ====================
    let faqInstructions = '';
    if (companyFaqs && companyFaqs.length > 0) {
      const faqList = companyFaqs.map((faq: any, index: number) => {
        // Usa o summary se disponÃ­vel (mais conciso), senÃ£o usa a resposta completa
        const resposta = faq.summary || faq.answer;
        return `${index + 1}. P: ${faq.question}\n   R: ${resposta}`;
      }).join('\n\n');
      
      faqInstructions = `\n\n[BASE DE CONHECIMENTO - PERGUNTAS FREQUENTES]
Use estas informaÃ§Ãµes para responder perguntas dos clientes. Se a pergunta do cliente for similar a alguma destas, use a resposta correspondente como base (pode adaptar o tom):

${faqList}

INSTRUÃ‡Ã•ES:
- Se o cliente perguntar algo que NÃƒO estÃ¡ no FAQ acima, NÃƒO invente - use escalate_to_human se necessÃ¡rio.
- VocÃª pode adaptar a linguagem das respostas para ser mais natural, mas mantenha a informaÃ§Ã£o correta.
- Estas sÃ£o informaÃ§Ãµes oficiais da empresa, confie nelas.`;
      
      console.log(`ðŸ“š FAQs carregados: ${companyFaqs.length} pergunta(s)`);
    }

    // PROMPT SAGRADO: apenas variÃ¡veis substituÃ­das + saudaÃ§Ã£o se primeiro contato + instruÃ§Ãµes adicionais + FAQ + estado expirado
    const systemPrompt = substituirVariaveis(masterPromptData?.prompt || 'VocÃª Ã© um assistente de agendamento.', {
      ai_name: aiConfig?.ai_name || 'Assistente',
      empresa_nome: company?.name || 'Empresa',
      contact_name: contactData?.name || 'Cliente',
      hora_atual: horaAtual,
      data_atual: dataAtual
    }) + greetingInstruction + additionalInstructions + faqInstructions + stateExpiredInstruction + confirmationInstruction;

    console.log('ðŸ“ Prompt length:', systemPrompt.length, 'chars');

    // ==================== 8. CHAMAR RESPONSES API COM MEMÃ“RIA NATIVA ====================
    console.log('ðŸ“¤ Chamando OpenAI Responses API...');

    // Detect GPT-5 models for proper parameter handling
    const isGPT5 = model.includes('gpt-5');
    
    // Montar request body com memÃ³ria nativa
    const requestBody: any = {
      model,
      max_output_tokens: maxTokens,
      store: true, // SEMPRE armazena para encadeamento
    };

    // Input depende se Ã© primeira mensagem ou encadeamento
    if (isFirstMessage) {
      // PRIMEIRA MENSAGEM: envia systemPrompt + mensagem do usuÃ¡rio
      requestBody.input = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ];
      console.log('ðŸ“¨ Modo: PRIMEIRA MENSAGEM (systemPrompt + message)');
    } else {
      // MENSAGENS SEGUINTES: sÃ³ a mensagem nova + previous_response_id
      requestBody.previous_response_id = state.last_response_id;
      if (confirmationInstruction) {
        requestBody.input = [
          { role: 'system', content: confirmationInstruction },
          { role: 'user', content: message }
        ];
      } else {
        requestBody.input = message; // SÃ“ a mensagem nova!
      }
      console.log('ðŸ“¨ Modo: ENCADEAMENTO (previous_response_id:', state.last_response_id?.substring(0, 20) + '...)');
    }

    // Add tools if we have any
    if (tools.length > 0) {
      requestBody.tools = tools;
    }

    // GPT-5 doesn't support temperature parameter
    if (!isGPT5 && temperature !== undefined && temperature !== null) {
      requestBody.temperature = temperature;
    }

    // Top_p can be used with some models
    if (!isGPT5 && topP !== undefined && topP !== null) {
      requestBody.top_p = topP;
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${keyData.api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('âŒ Responses API error:', response.status, errorText);
      throw new Error(`Responses API error: ${response.status} - ${errorText}`);
    }

    const responseData = await response.json();
    console.log('âœ… Resposta recebida:', { 
      id: responseData.id,
      status: responseData.status,
      outputLength: responseData.output?.length 
    });

    // ==================== 10. PROCESSAR OUTPUT (TEXT + TOOL CALLS) COM LOOP ====================
    let finalMessage = '';
    let escalated = false;
    let newStage = state.stage;
    let newCollectedData = { ...state.collected_data };
    let newConfirmedFacts = [...state.confirmed_facts];
    
    // Track function calls para logging
    const functionCallsLog: FunctionCallLog[] = [];
    let loopIterations = 0;
    const MAX_LOOP_ITERATIONS = 5; // SeguranÃ§a contra loops infinitos
    
    // Estado do loop - comeÃ§a com o output inicial
    let currentOutput = responseData.output || [];
    let currentResponseId = responseData.id;
    
    // Helper para extrair texto de um output
    const extractTextFromOutput = (output: any[]): string => {
      for (const item of output) {
        if (item.type === 'message') {
          const textContent = item.content?.find((c: any) => c.type === 'output_text' || c.type === 'text');
          if (textContent?.text) {
            return textContent.text;
          }
        }
      }
      return '';
    };
    
    // LOOP: Continua enquanto houver function_calls para processar
    while (loopIterations < MAX_LOOP_ITERATIONS) {
      loopIterations++;
      console.log(`ðŸ”„ Loop iteraÃ§Ã£o ${loopIterations}/${MAX_LOOP_ITERATIONS}`);
      
      // 1. Filtrar function_calls do output atual
      const functionCalls = currentOutput.filter((item: any) => item.type === 'function_call');
      
      // 2. Se nÃ£o hÃ¡ function_calls, extrair mensagem e sair
      if (functionCalls.length === 0) {
        console.log('âœ… Nenhum function_call pendente, extraindo mensagem final...');
        const extractedMessage = extractTextFromOutput(currentOutput);
        if (extractedMessage) {
          finalMessage = extractedMessage;
        }
        break;
      }
      
      console.log(`ðŸ› ï¸ Processando ${functionCalls.length} function_call(s)...`);
      
      // 3. Processar CADA function_call e coletar resultados
      const followUpInputItems: any[] = [];
      
      for (const fc of functionCalls) {
        const functionName = fc.name;
        const callId = fc.call_id || fc.id;
        const args = JSON.parse(fc.arguments || '{}');
        
        console.log(`ðŸ› ï¸ Executando: ${functionName}`, args);
        
        // Verificar se a aÃ§Ã£o Ã© permitida
        if (!allowedActions.includes(functionName)) {
          console.warn(`âš ï¸ Tool ${functionName} nÃ£o permitida no stage ${state.stage}`);
          // Adiciona resultado de erro
          followUpInputItems.push(
            { type: 'function_call', call_id: callId, name: functionName, arguments: fc.arguments },
            { type: 'function_call_output', call_id: callId, output: JSON.stringify({ error: `AÃ§Ã£o ${functionName} nÃ£o permitida no momento` }) }
          );
          continue;
        }
        
        let result: any;
        
        switch (functionName) {
          // ==================== INFO HANDLERS (SOB DEMANDA) ====================
          case 'get_company_info':
            result = await handleGetCompanyInfo(supabase, companyId);
            break;

          case 'get_professionals_catalog':
            result = await handleGetProfessionalsCatalog(supabase, companyId);
            break;

          // ==================== APPOINTMENT HANDLERS ====================
          case 'check_availability':
            result = await handleCheckAvailability(supabase, companyId, args);
            if (state.stage === 'idle') {
              newStage = 'scheduling';
            }
            if (args.professional_id) {
              const profData = await getProfessionalName(supabase, args.professional_id);
              if (profData) {
                newConfirmedFacts = addConfirmedFact(newConfirmedFacts, 'professional_selected', profData, { id: args.professional_id });
                newCollectedData.professional_id = args.professional_id;
              }
            }
            if (args.service_id) {
              const svcData = await getServiceName(supabase, args.service_id);
              if (svcData) {
                newConfirmedFacts = addConfirmedFact(newConfirmedFacts, 'service_selected', svcData, { id: args.service_id });
                newCollectedData.service_id = args.service_id;
              }
            }
            break;

          case 'create_appointment':
            result = await handleCreateAppointment(supabase, companyId, contactId, senderPhone, args);
            if (result.success) {
              // Salva selected_slot e patient_name nos collected_data
              newCollectedData.selected_slot = `${args.date} ${args.start_time}`;
              newCollectedData.patient_name = args.patient_name;
              
              newConfirmedFacts = addConfirmedFact(
                newConfirmedFacts, 
                'appointment_created', 
                `Agendamento para ${args.patient_name} em ${args.date} Ã s ${args.start_time}`,
                { appointment_id: result.appointment_id }
              );
              newStage = 'idle';
              newCollectedData = {};
            }
            break;

          case 'cancel_appointment':
            result = await handleCancelAppointment(supabase, companyId, contactId, senderPhone, args);
            if (result.success) {
              newConfirmedFacts = addConfirmedFact(
                newConfirmedFacts, 
                'appointment_cancelled', 
                result.message || 'Agendamento cancelado'
              );
              newStage = 'idle';
              newCollectedData = {};
            }
            break;

          case 'reschedule_appointment':
            result = await handleRescheduleAppointment(supabase, companyId, contactId, senderPhone, args);
            if (result.success) {
              newConfirmedFacts = addConfirmedFact(
                newConfirmedFacts, 
                'appointment_rescheduled', 
                `Reagendado para ${args.new_date} Ã s ${args.new_start_time}`
              );
              newStage = 'idle';
              newCollectedData = {};
            }
            break;

          case 'list_appointments':
            result = await handleListAppointments(supabase, companyId, contactId, senderPhone, args);
            if (state.stage === 'idle') {
              newStage = 'consulting';
            }
            break;

          case 'escalate_to_human':
            result = await handleEscalateToHuman(supabase, contactId, args.reason);
            escalated = true;
            break;

          case 'mark_urgent':
            result = await handleMarkUrgent(supabase, contactId, args.reason);
            break;
            
          default:
            result = { error: `Handler nÃ£o encontrado para ${functionName}` };
        }
        
        // Logar function call
        functionCallsLog.push({
          name: functionName,
          args,
          result: typeof result === 'object' ? JSON.stringify(result).substring(0, 500) : result,
          timestamp: new Date().toISOString()
        });
        
        // Adicionar ao input do follow-up (com response_instruction se configurada)
        let instruction = responseInstructions[functionName];
        let outputContent = JSON.stringify(result);
        
        // DEBUG: Log para confirmar se instruction existe
        console.log(`ðŸ” DEBUG ${functionName}: responseInstructions keys = [${Object.keys(responseInstructions).join(', ')}]`);
        console.log(`ðŸ” DEBUG ${functionName}: instruction encontrada = ${instruction ? 'SIM' : 'NÃƒO'}`);
        if (instruction) {
          console.log(`ðŸ” DEBUG ${functionName}: instruction preview = "${instruction.substring(0, 80)}..."`);
        }
        
        // Se hÃ¡ instruÃ§Ã£o configurada, substituir variÃ¡veis e concatenar com os dados
        if (instruction) {
          // Substituir variÃ¡veis de configuraÃ§Ã£o no response_instruction
          instruction = substituirVariaveis(instruction, {
            show_next_slots: String(aiConfig?.show_next_slots || 3),
          });
          outputContent = `[INSTRUÃ‡ÃƒO DE INTERPRETAÃ‡ÃƒO]\n${instruction}\n\n[DADOS]\n${outputContent}`;
          console.log(`âœ… Response instruction APLICADA para ${functionName}`);
          console.log(`ðŸ“¤ outputContent final (primeiros 300 chars): ${outputContent.substring(0, 300)}`);
        } else {
          console.log(`âš ï¸ SEM instruction para ${functionName} - enviando apenas dados brutos`);
        }
        
        followUpInputItems.push(
          { type: 'function_call', call_id: callId, name: functionName, arguments: fc.arguments },
          { type: 'function_call_output', call_id: callId, output: outputContent }
        );
      }
      
      // 4. Se nÃ£o hÃ¡ items para follow-up (todos foram bloqueados), sair
      if (followUpInputItems.length === 0) {
        console.log('âš ï¸ Nenhum resultado de function para enviar, saindo do loop');
        break;
      }
      
      // 5. Fazer follow-up com TODOS os resultados
      console.log(`ðŸ“¤ Enviando ${followUpInputItems.length / 2} resultados de tools para follow-up...`);
      
      const followUpResponse = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${keyData.api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          input: followUpInputItems,
          previous_response_id: currentResponseId,
          tools,
          max_output_tokens: maxTokens,
          store: true,
        })
      });
      
      if (!followUpResponse.ok) {
        const errorText = await followUpResponse.text();
        console.error('âŒ Follow-up call falhou:', followUpResponse.status, errorText);
        break;
      }
      
      const followUpData = await followUpResponse.json();
      console.log('âœ… Follow-up response:', { 
        id: followUpData.id, 
        outputLength: followUpData.output?.length,
        outputTypes: followUpData.output?.map((o: any) => o.type)
      });
      
      // 6. Acumular tokens
      if (followUpData.usage) {
        responseData.usage = responseData.usage || {};
        responseData.usage.input_tokens = (responseData.usage.input_tokens || 0) + (followUpData.usage.input_tokens || 0);
        responseData.usage.output_tokens = (responseData.usage.output_tokens || 0) + (followUpData.usage.output_tokens || 0);
        responseData.usage.total_tokens = (responseData.usage.total_tokens || 0) + (followUpData.usage.total_tokens || 0);
      }
      
      // 7. Atualizar para prÃ³xima iteraÃ§Ã£o
      currentOutput = followUpData.output || [];
      currentResponseId = followUpData.id;
      responseData.id = followUpData.id; // Atualiza ID global para salvar no estado
      
      // Loop continua - se follow-up tiver mais function_calls, processa novamente
      // Se tiver apenas message, extrai na prÃ³xima iteraÃ§Ã£o e sai
    }
    
    // Se atingiu limite de iteraÃ§Ãµes, logar aviso
    if (loopIterations >= MAX_LOOP_ITERATIONS) {
      console.warn(`âš ï¸ Atingiu limite de ${MAX_LOOP_ITERATIONS} iteraÃ§Ãµes do loop`);
    }

    // Fallback if no message after all iterations
    if (!finalMessage) {
      console.warn('âš ï¸ Nenhuma mensagem final extraÃ­da, usando fallback');
      finalMessage = FALLBACK_MESSAGE;
    }

    // ==================== 11. ATUALIZAR ESTADO ====================
    if (confirmedAppointment?.id) {
      newConfirmedFacts = addConfirmedFact(
        newConfirmedFacts,
        'appointment_confirmed',
        `Agendamento confirmado para ${confirmedAppointment.date} Ã s ${confirmedAppointment.time}`,
        { appointment_id: confirmedAppointment.id }
      );
    }
    const newExpiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000).toISOString();

    await supabase
      .from('conversation_state')
      .upsert({
        id: state.id,
        conversation_id: conversationId,
        company_id: companyId,
        stage: newStage,
        collected_data: newCollectedData,
        confirmed_facts: newConfirmedFacts,
        has_active_appointment: state.has_active_appointment,
        has_previous_appointment: state.has_previous_appointment,
        pending_action: newPendingAction,
        expires_at: newExpiresAt,
        last_response_id: responseData.id // Salva o ID para encadeamento na prÃ³xima mensagem!
      });

    console.log('ðŸ“Š Novo estado:', { 
      stage: newStage, 
      collectedData: Object.keys(newCollectedData),
      confirmedFacts: newConfirmedFacts.length,
      pendingAction: newPendingAction,
      lastResponseId: responseData.id?.substring(0, 20) + '...'
    });

    // ==================== 12. SALVAR LOG COMPLETO ====================
    const tokensInput = responseData.usage?.input_tokens || 0;
    const tokensOutput = responseData.usage?.output_tokens || 0;
    const tokensUsed = responseData.usage?.total_tokens || 0;
    const responseTime = Date.now() - startTime;

    try {
      await supabase
        .from('ai_prompt_logs')
        .insert({
          company_id: companyId,
          contact_id: contactId || null,
          conversation_id: conversationId,
          user_message: message,
          full_prompt: isFirstMessage ? systemPrompt : `[encadeado via previous_response_id: ${state.last_response_id?.substring(0, 30)}...]`,
          ai_response: finalMessage,
          is_first_message: isFirstMessage,
          previous_response_id: isFirstMessage ? null : state.last_response_id,
          response_id_generated: responseData.id,
          function_calls: functionCallsLog,
          tokens_input: tokensInput,
          tokens_output: tokensOutput,
          tokens_total: tokensUsed,
          model_used: model,
          response_time_ms: responseTime,
          conversation_stage: newStage,
          loop_iterations: loopIterations,
          message_count: 1,
          ai_config_snapshot: { 
            model, 
            maxTokens, 
            temperature: isGPT5 ? 'N/A (GPT-5)' : temperature,
            allowedActions 
          }
        });
      console.log('ðŸ“ Log salvo com sucesso');
    } catch (logError) {
      console.error('âš ï¸ Erro ao salvar log (nÃ£o crÃ­tico):', logError);
    }

    // ==================== 13. RETORNAR RESPOSTA ====================
    console.log('âœ… Resposta gerada em', responseTime, 'ms');
    console.log('ðŸ“Š Tokens:', { input: tokensInput, output: tokensOutput, total: tokensUsed });
    console.log('ðŸ“Š Function calls:', functionCallsLog.length);
    console.log('ðŸ¤– ==================== FIM CHAT-AI-RESPONSES ====================');

    return new Response(JSON.stringify({
      response: finalMessage,
      tokensUsed,
      escalated,
      stage: newStage
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('âŒ Erro fatal:', error);
    return new Response(JSON.stringify({
      response: FALLBACK_MESSAGE,
      error: error instanceof Error ? error.message : 'Unknown error',
      tokensUsed: 0,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ==================== INFO HANDLERS (NOVOS - SOB DEMANDA) ====================

async function handleGetCompanyInfo(supabase: any, companyId: string): Promise<any> {
  try {
    const { data: company } = await supabase
      .from('companies')
      .select('name, owner_whatsapp')
      .eq('id', companyId)
      .single();

    const { data: settings } = await supabase
      .from('company_settings')
      .select('address, email, alternative_phone, google_maps_link, business_hours')
      .eq('company_id', companyId)
      .single();

    if (!company) return { error: 'Empresa nÃ£o encontrada' };

    return {
      nome: company.name,
      endereco: settings?.address || 'NÃ£o informado',
      telefone: settings?.alternative_phone || company.owner_whatsapp || 'NÃ£o informado',
      email: settings?.email || 'NÃ£o informado',
      google_maps: settings?.google_maps_link || null,
      horario_funcionamento: settings?.business_hours || 'NÃ£o informado'
    };
  } catch (err) {
    console.error('Erro get_company_info:', err);
    return { error: 'NÃ£o foi possÃ­vel obter informaÃ§Ãµes da empresa' };
  }
}

async function handleGetProfessionalsCatalog(supabase: any, companyId: string): Promise<any> {
  try {
    // Buscar profissionais ativos
    const { data: professionals } = await supabase
      .from('professionals')
      .select('id, name, specialty')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('name');

    if (!professionals || professionals.length === 0) {
      return { catalogo: [], message: 'Nenhum profissional cadastrado' };
    }

    // Para cada profissional, buscar serviÃ§os vinculados
    const catalogo = await Promise.all(professionals.map(async (prof: any) => {
      const { data: links } = await supabase
        .from('service_professionals')
        .select('service:services(id, name, duration, price, is_active)')
        .eq('professional_id', prof.id);
      
      const servicos = (links || [])
        .filter((sp: any) => sp.service && sp.service.is_active)
        .map((sp: any) => ({
          id: sp.service.id,
          nome: sp.service.name,
          duracao_minutos: sp.service.duration,
          preco: sp.service.price || 0
        }));

      return {
        profissional: {
          id: prof.id,
          nome: prof.name,
          especialidade: prof.specialty || null
        },
        servicos
      };
    }));

    // Filtrar profissionais sem serviÃ§os vinculados
    const catalogoFiltrado = catalogo.filter(item => item.servicos.length > 0);

    if (catalogoFiltrado.length === 0) {
      return { catalogo: [], message: 'Nenhum profissional com serviÃ§os configurados' };
    }

    return { catalogo: catalogoFiltrado };
  } catch (err) {
    console.error('Erro get_professionals_catalog:', err);
    return { error: 'NÃ£o foi possÃ­vel listar o catÃ¡logo de profissionais' };
  }
}

// ==================== HELPER PARA BUSCAR NOMES ====================

async function getProfessionalName(supabase: any, professionalId: string): Promise<string | null> {
  const { data } = await supabase
    .from('professionals')
    .select('name')
    .eq('id', professionalId)
    .maybeSingle();
  return data?.name || null;
}

async function getServiceName(supabase: any, serviceId: string): Promise<string | null> {
  const { data } = await supabase
    .from('services')
    .select('name')
    .eq('id', serviceId)
    .maybeSingle();
  return data?.name || null;
}

// ==================== APPOINTMENT HANDLERS (MANTIDOS) ====================

async function handleCheckAvailability(supabase: any, companyId: string, args: any) {
  try {
    // NÃ£o precisa mais de date - sistema calcula automaticamente
    const { data, error } = await supabase.functions.invoke('check-availability', {
      body: {
        companyId,
        serviceId: args.service_id,
        professionalId: args.professional_id || null,
        startDate: args.date || null, // Opcional agora
        endDate: null,
        limit: 8 // Mostrar mais opÃ§Ãµes
      }
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Erro check_availability:', err);
    return { error: 'NÃ£o foi possÃ­vel verificar disponibilidade' };
  }
}

async function handleCreateAppointment(supabase: any, companyId: string, contactId: string, senderPhone: string, args: any) {
  try {
    // Validar que temos patient_name
    if (!args.patient_name || args.patient_name.trim().length < 2) {
      return { success: false, error: 'NOME_OBRIGATORIO', message: 'Por favor, informe o nome completo do paciente.' };
    }

    const { data: service } = await supabase
      .from('services')
      .select('duration')
      .eq('id', args.service_id)
      .maybeSingle();

    if (!service) return { error: 'ServiÃ§o nÃ£o encontrado' };

    const duration = service.duration;
    const [hours, minutes] = args.start_time.split(':').map(Number);
    const endMinutes = hours * 60 + minutes + duration;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

    const { data: conflicts } = await supabase
      .from('appointments')
      .select('id')
      .eq('professional_id', args.professional_id)
      .eq('date', args.date)
      .not('status', 'in', '("cancelled","no_show")')
      .lt('start_time', endTime)
      .gt('end_time', args.start_time);

    if (conflicts && conflicts.length > 0) {
      return { success: false, error: 'HORÃRIO_OCUPADO', message: 'Este horÃ¡rio jÃ¡ estÃ¡ ocupado.' };
    }

    // Atualizar nome do contato se necessÃ¡rio
    const patientName = args.patient_name.trim();
    await supabase
      .from('contacts')
      .update({ name: patientName })
      .eq('id', contactId);

    const { data, error } = await supabase
      .from('appointments')
      .insert({
        company_id: companyId,
        contact_id: contactId,
        service_id: args.service_id,
        professional_id: args.professional_id,
        date: args.date,
        start_time: args.start_time,
        end_time: endTime,
        status: 'scheduled',
        notes: `Paciente: ${patientName}`
      })
      .select()
      .single();

    if (error) throw error;

    return { 
      success: true, 
      message: `Agendamento confirmado para ${patientName} em ${args.date} Ã s ${args.start_time}`, 
      appointment_id: data.id,
      patient_name: patientName
    };
  } catch (err) {
    console.error('Erro create_appointment:', err);
    return { error: 'NÃ£o foi possÃ­vel criar o agendamento' };
  }
}

async function handleCancelAppointment(supabase: any, companyId: string, contactId: string, senderPhone: string, args: any) {
  try {
    let appointmentId = args.appointment_id;
    
    if (!appointmentId || appointmentId.length < 10) {
      const today = new Date().toISOString().split('T')[0];
      const { data: appointments } = await supabase
        .from('appointments')
        .select('id, date, start_time')
        .eq('contact_id', contactId)
        .eq('company_id', companyId)
        .gte('date', today)
        .in('status', ['scheduled', 'confirmed'])
        .order('date', { ascending: true })
        .limit(1);
      
      if (!appointments || appointments.length === 0) {
        return { error: 'Nenhum agendamento encontrado para cancelar' };
      }
      appointmentId = appointments[0].id;
    }

    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled', notes: args.reason || null })
      .eq('id', appointmentId)
      .eq('company_id', companyId);

    if (error) throw error;

    return { success: true, message: 'Agendamento cancelado com sucesso' };
  } catch (err) {
    console.error('Erro cancel_appointment:', err);
    return { error: 'NÃ£o foi possÃ­vel cancelar' };
  }
}

async function handleRescheduleAppointment(supabase: any, companyId: string, contactId: string, senderPhone: string, args: any) {
  try {
    let appointmentId = args.appointment_id;
    
    if (!appointmentId || appointmentId.length < 10) {
      const today = new Date().toISOString().split('T')[0];
      const { data: appointments } = await supabase
        .from('appointments')
        .select('id, service_id, professional_id, services(duration)')
        .eq('contact_id', contactId)
        .eq('company_id', companyId)
        .gte('date', today)
        .in('status', ['scheduled', 'confirmed'])
        .order('date', { ascending: true })
        .limit(1);
      
      if (!appointments || appointments.length === 0) {
        return { error: 'Nenhum agendamento encontrado para reagendar' };
      }
      appointmentId = appointments[0].id;
      
      const duration = appointments[0].services?.duration || 30;
      const [hours, minutes] = args.new_start_time.split(':').map(Number);
      const endMinutes = hours * 60 + minutes + duration;
      const newEndTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

      const { error } = await supabase
        .from('appointments')
        .update({ date: args.new_date, start_time: args.new_start_time, end_time: newEndTime })
        .eq('id', appointmentId);

      if (error) throw error;

      return { success: true, message: `Reagendado para ${args.new_date} Ã s ${args.new_start_time}` };
    }

    return { error: 'Dados insuficientes para reagendar' };
  } catch (err) {
    console.error('Erro reschedule_appointment:', err);
    return { error: 'NÃ£o foi possÃ­vel reagendar' };
  }
}

async function handleListAppointments(supabase: any, companyId: string, contactId: string, senderPhone: string, args: any) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    let query = supabase
      .from('appointments')
      .select('id, date, start_time, status, services(name), professionals(name)')
      .eq('contact_id', contactId)
      .eq('company_id', companyId)
      .order('date', { ascending: true });

    if (!args.include_past) {
      query = query.gte('date', today);
    }

    const { data, error } = await query.limit(10);
    if (error) throw error;

    if (!data || data.length === 0) {
      return { appointments: [], message: 'Nenhum agendamento encontrado' };
    }

    return {
      appointments: data.map((a: any) => ({
        id: a.id,
        data: a.date,
        horario: a.start_time,
        servico: a.services?.name,
        profissional: a.professionals?.name,
        status: a.status
      }))
    };
  } catch (err) {
    console.error('Erro list_appointments:', err);
    return { error: 'NÃ£o foi possÃ­vel listar agendamentos' };
  }
}

async function handleEscalateToHuman(supabase: any, contactId: string, reason: string) {
  try {
    if (!contactId) return { success: false, error: 'Contato nÃ£o identificado' };

    const { data: contact } = await supabase
      .from('contacts')
      .select('tags')
      .eq('id', contactId)
      .maybeSingle();

    const existingTags = contact?.tags || [];
    if (!existingTags.includes('Aguardando Humano')) {
      await supabase
        .from('contacts')
        .update({ tags: [...existingTags, 'Aguardando Humano'] })
        .eq('id', contactId);
    }

    return { success: true, message: 'Atendente humano serÃ¡ notificado' };
  } catch (err) {
    console.error('Erro escalate_to_human:', err);
    return { error: 'NÃ£o foi possÃ­vel escalar' };
  }
}

async function handleMarkUrgent(supabase: any, contactId: string, reason?: string) {
  try {
    if (!contactId) return { success: false, error: 'Contato nÃ£o identificado' };

    const { data: contact } = await supabase
      .from('contacts')
      .select('tags')
      .eq('id', contactId)
      .maybeSingle();

    const existingTags = contact?.tags || [];
    if (!existingTags.includes('Urgente')) {
      await supabase
        .from('contacts')
        .update({ tags: [...existingTags, 'Urgente'] })
        .eq('id', contactId);
    }

    return { success: true, message: 'Conversa marcada como urgente' };
  } catch (err) {
    console.error('Erro mark_urgent:', err);
    return { error: 'NÃ£o foi possÃ­vel marcar como urgente' };
  }
}


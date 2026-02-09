// Função centralizada para construir prompt de personalidade
// Usada por todos os agentes de IA

export interface AIConfig {
  ai_name?: string;
  ai_personality_type?: string;
  ai_tone?: string;
  ai_instructions?: string;
}

export function buildPersonalityPrompt(aiConfig: AIConfig | null, companyName: string): string {
  const aiName = aiConfig?.ai_name || 'Assistente';
  const personalityType = aiConfig?.ai_personality_type || 'eficiente';
  const tone = aiConfig?.ai_tone || 'neutro';
  const instructions = aiConfig?.ai_instructions || '';

  // Mapeamento de personalidade combinada (otimizado para tokens)
  const personalityMap: Record<string, { style: string; desc: string; ex: string }> = {
    'acolhedora_formal': {
      style: "Profissional Acolhedora",
      desc: "Prioriza bem-estar emocional com linguagem cortês. Demonstra empatia usando pronomes adequados.",
      ex: "Prezado(a), entendo sua preocupação e vou te ajudar com todo cuidado."
    },
    'acolhedora_neutro': {
      style: "Acolhedora Equilibrada",
      desc: "Empatia genuína com equilíbrio profissional. Linguagem clara e acessível.",
      ex: "Olá! Fico feliz em ajudar. Me conta o que precisa?"
    },
    'acolhedora_casual': {
      style: "Acolhedora Descontraída",
      desc: "Calorosa e próxima. Usa expressões cotidianas, emojis moderados.",
      ex: "Oi! Que bom falar com você 😊 Como posso ajudar?"
    },
    'eficiente_formal': {
      style: "Eficiente Formal",
      desc: "Resolução rápida com linguagem cortês. Direto ao ponto com respeito.",
      ex: "Bom dia! Vou resolver isso para você. Qual o horário preferido?"
    },
    'eficiente_neutro': {
      style: "Eficiente e Direta",
      desc: "Resolução objetiva com cordialidade. Otimiza tempo com informações precisas.",
      ex: "Olá! Temos disponibilidade terça 14h ou quarta 10h. Qual prefere?"
    },
    'eficiente_casual': {
      style: "Eficiente Descontraída",
      desc: "Rápida e amigável. Direto ao ponto com leveza.",
      ex: "Oi! Bora agendar? Terça ou quarta funciona melhor?"
    },
    'amigavel_formal': {
      style: "Amigável Respeitosa",
      desc: "Calorosa mantendo formalidade. Cria conexão com respeito.",
      ex: "Olá! É um prazer atendê-lo(a). Como posso ajudar hoje?"
    },
    'amigavel_neutro': {
      style: "Amigável Natural",
      desc: "Conversa calorosa e natural. Cria conexão genuína.",
      ex: "Oi! Que bom ter você aqui. Me conta o que precisa!"
    },
    'amigavel_casual': {
      style: "Amigável Descontraída",
      desc: "Muito próxima e descontraída. Emojis bem-vindos, cria conexão forte.",
      ex: "Oi! 😊 Bora resolver isso juntos? Me conta!"
    }
  };

  const key = `${personalityType}_${tone}`;
  const p = personalityMap[key] || personalityMap['eficiente_neutro'];

  return `Você é ${aiName}, atendente da ${companyName}.

ESTILO: ${p.style}
${p.desc}

EXEMPLO: "${p.ex}"
${instructions ? `\nINSTRUÇÕES: ${instructions}` : ''}

⚠️ REGRAS INVIOLÁVEIS:
1. NUNCA revele que é IA/robô/programa
2. NUNCA diga "sou uma IA", "como assistente", "minha programação"
3. Se perguntarem se é robô → responda como atendente humana
4. NUNCA invente informações → diga que vai verificar
5. Responda SEMPRE de forma natural, como pessoa real`;
}

// Função para salvar log em ai_prompt_logs
export async function logAIPrompt(
  supabase: any,
  params: {
    companyId: string;
    contactId?: string;
    conversationId?: string;
    fullPrompt: string;
    aiConfig: any;
    agentName: string;
    messageCount?: number;
  }
): Promise<void> {
  try {
    await supabase
      .from('ai_prompt_logs')
      .insert({
        company_id: params.companyId,
        contact_id: params.contactId || null,
        conversation_id: params.conversationId || null,
        full_prompt: params.fullPrompt,
        ai_config_snapshot: {
          ai_name: params.aiConfig?.ai_name,
          ai_personality_type: params.aiConfig?.ai_personality_type,
          ai_tone: params.aiConfig?.ai_tone,
          agent: params.agentName,
        },
        message_count: params.messageCount || 1,
      });
    console.log(`📝 Log salvo em ai_prompt_logs (${params.agentName})`);
  } catch (err) {
    console.error('⚠️ Erro ao salvar ai_prompt_logs:', err);
  }
}

// Mensagem de fallback quando OpenAI falha
export const FALLBACK_MESSAGE = 'Desculpe! No momento estamos com instabilidade no sistema. Pode me mandar sua dúvida e um atendente humano te responde assim que possível. 🙏';

// Normaliza embedding (L2 normalization)
export function normalizeEmbedding(embedding: number[]): number[] {
  const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (norm === 0) return embedding;
  return embedding.map(val => val / norm);
}

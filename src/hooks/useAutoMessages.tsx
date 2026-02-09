import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AutoMessage {
  id: string;
  message_type: string;
  content: string;
  is_active: boolean;
}

const logAudit = async (companyId: string, action: string, payloadAfter?: any) => {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const actorId = auth?.user?.id || null;
    await supabase.from("audit_logs").insert({
      company_id: companyId,
      actor_user_id: actorId,
      actor_type: "user",
      action,
      entity_type: "auto_message_template",
      entity_id: payloadAfter?.id ?? null,
      payload_after: payloadAfter ?? null,
    });
  } catch {
    // Non-blocking
  }
};

export const MESSAGE_TYPES = {
  APPOINTMENT_CONFIRMATION: 'appointment_confirmation',
  APPOINTMENT_REMINDER: 'appointment_reminder',
  POST_ATTENDED_FOLLOWUP: 'post_attended_followup',
  POST_MISSED_FOLLOWUP: 'post_missed_followup',
  RESCHEDULING_BLOCKED: 'rescheduling_blocked',
  SCHEDULED_RETURN_REMINDER: 'scheduled_return_reminder',
  BIRTHDAY_MESSAGE: 'birthday_message',
} as const;

export const MESSAGE_TYPE_INFO = {
  [MESSAGE_TYPES.APPOINTMENT_CONFIRMATION]: {
    title: 'Pré-Agendamento - Confirmação de Presença',
    description: 'Mensagem enviada antes do agendamento solicitando confirmar presença',
    defaultContent: 'Olá, {{client_name}}! Tudo bem com você?\nPassando pra confirmar seu horário: {{date}} às {{time}} com {{professional_name}} ({{service_name}}).\nPode me confirmar se está tudo certo?\nCaso precise remarcar, sem problema — é só avisar por aqui!',
    variables: ['{{client_name}}', '{{date}}', '{{time}}', '{{professional_name}}', '{{service_name}}', '{{company_name}}', '{{company_phone}}'],
  },
  [MESSAGE_TYPES.APPOINTMENT_REMINDER]: {
    title: 'Lembrete de Agendamento',
    description: 'Mensagem enviada 24h antes da consulta para lembrar o cliente',
    defaultContent: 'Olá, {{client_name}}! Passando pra lembrar da sua consulta dia {{date}} ({{weekday}}) às {{time}} com {{professional_name}}.\nSe precisar ajustar o horário, é só me avisar por aqui.',
    variables: ['{{client_name}}', '{{date}}', '{{weekday}}', '{{time}}', '{{professional_name}}', '{{company_name}}', '{{company_phone}}'],
  },
  [MESSAGE_TYPES.POST_ATTENDED_FOLLOWUP]: {
    title: 'Pós-agendamento – Cliente Compareceu',
    description: 'Mensagem enviada 24h após a o status do agendamento ser alterado para "Compareceu"',
    defaultContent: 'Olá, {{client_name}}.\nAqui na {{company_name}}, prezamos sempre pelo seu bem-estar e pela qualidade do atendimento.\nPoderia nos contar como foi sua experiência com {{professional_name}}?',
    variables: ['{{client_name}}', '{{professional_name}}', '{{company_name}}', '{{company_phone}}'],
  },
  [MESSAGE_TYPES.POST_MISSED_FOLLOWUP]: {
    title: 'Pós-agendamento – Não Compareceu',
    description: 'Mensagem enviada 24h após agendamento marcado como "Não Compareceu"',
    defaultContent: 'Olá, {{client_name}}.\nVerificamos que você não pôde comparecer ao seu horário em {{date}} às {{time}}.\nCaso deseje reagendar, nossa equipe da {{company_name}} está à disposição para encontrar um novo horário conveniente.',
    variables: ['{{client_name}}', '{{date}}', '{{time}}', '{{company_name}}', '{{company_phone}}'],
  },
  [MESSAGE_TYPES.RESCHEDULING_BLOCKED]: {
    title: 'Reagendamento - Bloqueio de Horário com Agendamento',
    description: 'Mensagem enviada quando um agendamento for cancelado por bloqueio',
    defaultContent: 'Olá, {{client_name}}.\nPor motivo de ajuste interno, precisaremos reagendar sua consulta marcada para {{date}} às {{time}} com {{professional_name}}.\nPodemos verificar juntos um novo horário que fique melhor para você?\nBasta responder por aqui e já te mostro as opções disponíveis.\nAgradecemos pela compreensão.\n{{company_name}}',
    variables: ['{{client_name}}', '{{date}}', '{{time}}', '{{professional_name}}', '{{company_name}}', '{{company_phone}}'],
  },
  [MESSAGE_TYPES.SCHEDULED_RETURN_REMINDER]: {
    title: 'Retorno Programado - Lembrete ao Cliente',
    description: 'Mensagem enviada X dias antes do retorno agendado',
    defaultContent: 'Olá, {{client_name}}! Como você está?\nAqui é da {{company_name}}. Tá na hora de cuidar de você de novo!\nQue tal agendar seu retorno para {{service_name}} com {{professional_name}}?\nMe avisa por aqui e já vejo os melhores horários pra você.',
    variables: ['{{client_name}}', '{{date}}', '{{time}}', '{{professional_name}}', '{{service_name}}', '{{company_name}}', '{{company_phone}}'],
  },
  [MESSAGE_TYPES.BIRTHDAY_MESSAGE]: {
    title: 'Mensagem de Aniversário',
    description: 'Mensagem enviada no dia do aniversário do cliente',
    defaultContent: 'Ei, {{client_name}}! Hoje é o seu dia!\nA equipe da {{company_name}} te deseja um aniversário cheio de alegria, boas risadas e gente que te faz bem.\nQue o dia renda bons momentos — e que o ano venha leve, produtivo e cheio de vitórias.\nParabéns!',
    variables: ['{{client_name}}', '{{company_name}}', '{{company_phone}}'],
  },
};

export const useAutoMessages = () => {
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["auto-messages"],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      const { data, error } = await supabase
        .from("auto_message_templates")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("message_type");

      if (error) throw error;
      return data as AutoMessage[];
    },
  });

  const createMessage = useMutation({
    mutationFn: async (message: Omit<AutoMessage, "id">) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      const { data, error } = await supabase
        .from("auto_message_templates")
        .insert({ ...message, company_id: profile.company_id })
        .select("*")
        .single();

      if (error) throw error;
      await logAudit(profile.company_id, "auto_message_created", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auto-messages"] });
    },
    onError: () => {
      toast.error("Erro ao criar mensagem");
    },
  });

  const updateMessage = useMutation({
    mutationFn: async (message: AutoMessage) => {
      const { data, error } = await supabase
        .from("auto_message_templates")
        .update({
          message_type: message.message_type,
          content: message.content,
          is_active: message.is_active,
        })
        .eq("id", message.id)
        .select("*")
        .single();

      if (error) throw error;
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();
      if (profile?.company_id) {
        await logAudit(profile.company_id, "auto_message_updated", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auto-messages"] });
    },
    onError: () => {
      toast.error("Erro ao atualizar mensagem");
    },
  });

  const deleteMessage = useMutation({
    mutationFn: async (id: string) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      const { error } = await supabase
        .from("auto_message_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
      if (profile?.company_id) {
        await logAudit(profile.company_id, "auto_message_deleted", { id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auto-messages"] });
      toast.success("Mensagem excluída com sucesso");
    },
    onError: () => {
      toast.error("Erro ao excluir mensagem");
    },
  });

  const initializeMessages = useMutation({
    mutationFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      console.log(`🔧 Inicializando mensagens para company_id: ${profile.company_id}`);

      // Para cada tipo predefinido, inserir se não existir
      const promises = Object.values(MESSAGE_TYPES).map(async (type) => {
        const info = MESSAGE_TYPE_INFO[type];
        
        // Verificar se já existe
        const { data: existing } = await supabase
          .from("auto_message_templates")
          .select("id")
          .eq("company_id", profile.company_id)
          .eq("message_type", type)
          .maybeSingle();

        // Se não existir, criar
        if (!existing) {
          console.log(`✨ Criando mensagem: ${type}`);
          const { error } = await supabase
            .from("auto_message_templates")
            .insert({
          company_id: profile.company_id,
          message_type: type,
          content: info.defaultContent,
          is_active: true,
            });
          
          if (error) {
            console.error(`❌ Erro ao criar ${type}:`, error);
            throw error;
          }
        }
      });

      await Promise.all(promises);
      console.log('✅ Todas as mensagens foram inicializadas');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auto-messages"] });
      toast.success("Mensagens automáticas inicializadas com sucesso");
    },
    onError: (error: any) => {
      console.error('❌ Erro ao inicializar mensagens:', error);
      toast.error(`Erro ao inicializar mensagens: ${error.message || 'Erro desconhecido'}`);
    },
  });

  const resetMessagesToDefault = useMutation({
    mutationFn: async (messageType?: string) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      // Se messageType for passado, restaurar apenas essa mensagem
      if (messageType) {
        const info = MESSAGE_TYPE_INFO[messageType];
        
        // Buscar o registro atual para preservar is_active
        const { data: currentMessage } = await supabase
          .from("auto_message_templates")
          .select("is_active")
          .eq("company_id", profile.company_id)
          .eq("message_type", messageType)
          .maybeSingle();
        
        // Preservar o estado ativo atual
        const { error } = await supabase
          .from("auto_message_templates")
          .update({ 
            content: info.defaultContent,
            is_active: currentMessage?.is_active ?? true
          })
          .eq("company_id", profile.company_id)
          .eq("message_type", messageType);
        
        if (error) throw error;
      } else {
        // Restaurar todas as mensagens
        const promises = Object.values(MESSAGE_TYPES).map(async (type) => {
          const info = MESSAGE_TYPE_INFO[type];
          
          // Buscar o registro atual para preservar is_active
          const { data: currentMessage } = await supabase
            .from("auto_message_templates")
            .select("is_active")
            .eq("company_id", profile.company_id)
            .eq("message_type", type)
            .maybeSingle();
          
          // Preservar o estado ativo atual
          const { error } = await supabase
            .from("auto_message_templates")
            .update({ 
              content: info.defaultContent,
              is_active: currentMessage?.is_active ?? true
            })
            .eq("company_id", profile.company_id)
            .eq("message_type", type);
          
          if (error) throw error;
        });

        await Promise.all(promises);
      }
    },
    onSuccess: (_, messageType) => {
      queryClient.invalidateQueries({ queryKey: ["auto-messages"] });
      if (messageType) {
        toast.success("Mensagem restaurada ao padrão!");
      } else {
        toast.success("Todas as mensagens restauradas ao padrão!");
      }
    },
    onError: () => {
      toast.error("Erro ao atualizar mensagens");
    },
  });

  return {
    messages,
    isLoading,
    createMessage,
    updateMessage,
    deleteMessage,
    initializeMessages,
    resetMessagesToDefault,
  };
};

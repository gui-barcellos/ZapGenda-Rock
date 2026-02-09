import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, Smile } from "lucide-react";
import { useSendMessage } from "@/hooks/useMessages";
import { isAIActive } from "@/lib/ai-utils";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

interface ChatInputProps {
  conversationId: string | null;
  contactId: string;
  whatsappConnectionId: string;
  phone: string;
  disabled?: boolean;
  aiDisabledUntil?: string | null;
  contactTags?: string[] | null;
}

export const ChatInput = ({
  conversationId,
  contactId,
  whatsappConnectionId,
  phone,
  disabled,
  aiDisabledUntil,
  contactTags,
}: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const sendMessage = useSendMessage();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const aiActive = isAIActive(aiDisabledUntil || null, contactTags || null);

  const handleSend = () => {
    if (!message.trim() || !conversationId) return;

    const messageToSend = message.trim();
    
    // 1. UI Otimista - Adicionar mensagem imediatamente
    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      content: messageToSend,
      direction: 'outbound',
      created_at: new Date().toISOString(),
      sent_by_user_id: user?.id,
      read_at: null,
      message_type: 'text',
      media_url: null,
      z_api_message_id: null,
    };

    queryClient.setQueryData(
      ["messages", conversationId],
      (old: any[] = []) => [...old, optimisticMessage]
    );

    // 2. Limpar input IMEDIATAMENTE
    setMessage("");

    // 3. Enviar mensagem em background (não bloquear UI)
    sendMessage.mutate({
      conversationId,
      contactId,
      whatsappConnectionId,
      phone,
      content: messageToSend,
    }, {
      onError: () => {
        // Se falhar, remover mensagem otimista
        queryClient.setQueryData(
          ["messages", conversationId],
          (old: any[] = []) => old.filter(m => m.id !== optimisticMessage.id)
        );
      }
    });

    // 4. Desativar IA em paralelo (não aguardar)
    if (aiActive) {
      disableAIInBackground(conversationId, contactId);
    }
  };

  const disableAIInBackground = async (convId: string, contactId: string) => {
    // Executar TUDO em paralelo (não sequencial)
    Promise.all([
      // Update 1: conversations
      supabase
        .from("conversations")
        .update({ ai_disabled_until: new Date(Date.now() + 3600000).toISOString() } as any)
        .eq("id", convId),
      
      // Update 2: contact tags (usando RPC otimizada)
      supabase.rpc('update_contact_tags', {
        p_contact_id: contactId,
        p_remove_tag: 'Aguardando Humano',
        p_add_tag: 'Aguardando Resposta'
      })
    ]).then(() => {
      // Invalidar só no final (leve, sem refetch)
      queryClient.invalidateQueries({ 
        queryKey: ["conversation", convId],
        refetchType: 'none'
      });
    }).catch(err => {
      console.error("Erro ao desativar IA:", err);
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="shrink-0 border-t p-3 bg-card">
      <div className="flex items-end gap-2">
        {/* Ícones à Esquerda */}
        <div className="flex gap-1 pb-2">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
            <Paperclip className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
            <Smile className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Input Central */}
        <Textarea
          placeholder="Digite uma mensagem..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={disabled || !conversationId}
          className="resize-none flex-1 rounded-3xl min-h-[40px] max-h-[120px]"
          rows={1}
        />
        
        {/* Botão Enviar à Direita */}
        <Button
          onClick={handleSend}
          disabled={disabled || !message.trim() || !conversationId || sendMessage.isPending}
          size="icon"
          className={cn(
            "shrink-0 h-10 w-10 rounded-full mb-1",
            !message.trim() && "bg-muted hover:bg-muted"
          )}
          title="Enviar mensagem"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

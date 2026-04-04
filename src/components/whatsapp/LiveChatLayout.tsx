import { useState, useEffect } from "react";
import { ConversationSidebar } from "./ConversationSidebar";
import { ChatMessageList } from "./ChatMessageList";
import { ChatInput } from "./ChatInput";
import { Button } from "@/components/ui/button";
import { GuidedEmptyState } from "@/components/company/GuidedEmptyState";
import { Bot, VolumeX, Star, MessageCircle, BotOff, Clock, MessageSquareOff, PlugZap } from "lucide-react";
import ContactDialog from "@/components/company/ContactDialog";
import { useConversation, useConversations } from "@/hooks/useConversations";
import { useConversationRealtime } from "@/hooks/useConversationRealtime";
import { useMessageFallback } from "@/hooks/useMessageFallback";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUrgentAlert } from "@/hooks/useUrgentAlert";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyData } from "@/hooks/useCompanyData";
import { useConnectedWhatsApp } from "@/hooks/useConnectedWhatsApp";
import { isAIActive } from "@/lib/ai-utils";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { formatPhoneDisplay } from "@/lib/phone-utils";
import { useCountdown } from "@/hooks/useCountdown";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Componente interno de botão de ícone minimalista
interface IconButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  title?: string;
}

const IconButton = ({ icon, onClick, active, title }: IconButtonProps) => (
  <button
    onClick={onClick}
    title={title}
    className={cn(
      "p-2 cursor-pointer transition-opacity duration-200",
      active ? "opacity-100" : "opacity-70",
      "hover:opacity-100"
    )}
  >
    {icon}
  </button>
);

export const LiveChatLayout = () => {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showMuteDialog, setShowMuteDialog] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [showProfilePictureDialog, setShowProfilePictureDialog] = useState(false);
  
  
  const { data: conversation } = useConversation(selectedConversationId);
  const { lastEventTimeRef } = useConversationRealtime(selectedConversationId);
  useMessageFallback(selectedConversationId, lastEventTimeRef); // Fallback polling inteligente
  const { hasUrgentConversations, urgentCount, isMuted, muteAlert, unmuteAlert } = useUrgentAlert(selectedConversationId);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const stored = localStorage.getItem('chat-sound-enabled');
    return stored !== null ? stored === 'true' : true; // Default: enabled
  });

  // Sincronizar som com localStorage
  useEffect(() => {
    localStorage.setItem('chat-sound-enabled', String(soundEnabled));
    if (!soundEnabled && !isMuted) {
      muteAlert();
    } else if (soundEnabled && isMuted) {
      unmuteAlert();
    }
  }, [soundEnabled, isMuted, muteAlert, unmuteAlert]);
  const { companyData } = useCompanyData();
  const { data: connectedWhatsApp } = useConnectedWhatsApp(companyData?.id ?? null);
  const { data: conversationsData } = useConversations("all");
  const queryClient = useQueryClient();

  const totalConversations = conversationsData?.pages.reduce((sum, page) => sum + page.conversations.length, 0) || 0;
  const hasConnectedWhatsApp = Boolean(connectedWhatsApp?.isConnected);

  // Countdown para reativação automática da IA
  const countdown = useCountdown(conversation?.ai_disabled_until || null);

  // Buscar foto de perfil proativamente quando abrir conversa sem foto
  useEffect(() => {
    if (!conversation?.contact_id || conversation?.contacts?.profile_picture_url) return;
    
    console.log('Fetching profile picture proactively for contact:', conversation.contact_id);
    
    supabase.functions.invoke('zapi-fetch-profile-picture', {
      body: { contactId: conversation.contact_id }
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['conversation', selectedConversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });
  }, [conversation?.contact_id, conversation?.contacts?.profile_picture_url, selectedConversationId, queryClient]);

  // Auto-adicionar tag "Aguardando Resposta" ao abrir conversa com "Aguardando Humano"
  useEffect(() => {
    if (conversation && conversation.contacts?.tags?.includes("Aguardando Humano")) {
      handleMarkAsResponding(conversation.id, conversation.contact_id);
    }
  }, [selectedConversationId]);

  const handleMarkAsResponding = async (conversationId: string, contactId: string) => {
    // Remove "Aguardando Humano" e adiciona "Aguardando Resposta"
    const { data: contact } = await supabase
      .from("contacts")
      .select("tags")
      .eq("id", contactId)
      .single();

    if (!contact) return;

    const newTags = (contact.tags || [])
      .filter((tag: string) => tag !== "Aguardando Humano")
      .concat("Aguardando Resposta");

    await supabase
      .from("contacts")
      .update({ tags: newTags })
      .eq("id", contactId);
  };

  const handleMarkAsResolved = async (contactId: string) => {
    // Remove "Aguardando Resposta"
    const { data: contact } = await supabase
      .from("contacts")
      .select("tags")
      .eq("id", contactId)
      .single();

    if (!contact) return;

    const newTags = (contact.tags || [])
      .filter((tag: string) => tag !== "Aguardando Resposta");

    await supabase
      .from("contacts")
      .update({ tags: newTags })
      .eq("id", contactId);
    
    queryClient.invalidateQueries({ queryKey: ["conversation", selectedConversationId] });
  };

  const handleAssumeConversation = async () => {
    if (!selectedConversationId || !conversation) return;
    
    // 1. Desativar IA por 60 minutos
    const disabledUntil = new Date();
    disabledUntil.setMinutes(disabledUntil.getMinutes() + 60);
    
    await (supabase
      .from("conversations")
      .update({ ai_disabled_until: disabledUntil.toISOString() } as any)
      .eq("id", selectedConversationId));
    
    // 2. Adicionar tag "Aguardando Resposta" e remover "Aguardando Humano"
    const { data: contact } = await supabase
      .from("contacts")
      .select("tags")
      .eq("id", conversation.contact_id)
      .single();
    
    if (contact) {
      const newTags = (contact.tags || [])
        .filter((tag: string) => tag !== "Aguardando Humano")
        .concat("Aguardando Resposta");
      
      await supabase
        .from("contacts")
        .update({ tags: newTags })
        .eq("id", conversation.contact_id);
    }
    
    queryClient.invalidateQueries({ queryKey: ["conversation", selectedConversationId] });
  };

  const handleReactivateAI = async () => {
    if (!selectedConversationId || !conversation) return;
    
    // 1. Limpar temporizador de desativação
    await (supabase
      .from("conversations")
      .update({ ai_disabled_until: null } as any)
      .eq("id", selectedConversationId));
    
    // 2. Remover tag "Aguardando Resposta"
    await handleMarkAsResolved(conversation.contact_id);
    
    queryClient.invalidateQueries({ queryKey: ["conversation", selectedConversationId] });
  };

  const handleDisableAIPermanently = async () => {
    if (!conversation) return;
    
    // Adicionar tag "IA Desativada" ao contato
    const { data: contact } = await supabase
      .from("contacts")
      .select("tags")
      .eq("id", conversation.contact_id)
      .single();
    
    if (contact) {
      const newTags = (contact.tags || []).concat("IA Desativada");
      
      await supabase
        .from("contacts")
        .update({ tags: newTags })
        .eq("id", conversation.contact_id);
    }
    
    queryClient.invalidateQueries({ queryKey: ["conversation", selectedConversationId] });
  };

  const handleReactivateAIPermanently = async () => {
    if (!conversation) return;
    
    // Remover tag "IA Desativada" do contato
    const { data: contact } = await supabase
      .from("contacts")
      .select("tags")
      .eq("id", conversation.contact_id)
      .single();
    
    if (contact) {
      const newTags = (contact.tags || []).filter((tag: string) => tag !== "IA Desativada");
      
      await supabase
        .from("contacts")
        .update({ tags: newTags })
        .eq("id", conversation.contact_id);
    }
    
    queryClient.invalidateQueries({ queryKey: ["conversation", selectedConversationId] });
  };

  const handleToggleFavorite = async () => {
    if (!selectedConversationId || !conversation) return;
    
    await (supabase
      .from("conversations")
      .update({ is_favorite: !conversation.is_favorite } as any)
      .eq("id", selectedConversationId));
    
    queryClient.invalidateQueries({ queryKey: ["conversation", selectedConversationId] });
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  };

  // Marcar conversa como lida automaticamente após visualizar
  useEffect(() => {
    if (selectedConversationId && conversation?.is_unread) {
      const timer = setTimeout(() => {
        supabase
          .from("conversations")
          .update({ is_unread: false } as any)
          .eq("id", selectedConversationId)
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
            queryClient.invalidateQueries({ queryKey: ["conversation", selectedConversationId] });
          });
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [selectedConversationId, conversation?.is_unread, queryClient]);

  return (
    <>
      {/* Botão de silenciar alerta urgente */}
      {hasUrgentConversations && !isMuted && (
        <div className="fixed top-4 right-4 z-50 animate-pulse">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowMuteDialog(true)}
          >
            <VolumeX className="h-4 w-4 mr-2" />
            Silenciar Urgente ({urgentCount})
          </Button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden h-full">
        <ConversationSidebar
          onSelectConversation={setSelectedConversationId}
          selectedConversationId={selectedConversationId}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedConversationId && conversation ? (
            <>
              <div className="flex items-center justify-between h-[60px] px-4 border-b border-[#eee] bg-white">
                <div className="flex items-center gap-3">
                  <Avatar 
                    className="h-10 w-10 cursor-pointer"
                    onClick={() => setShowProfilePictureDialog(true)}
                  >
                    {conversation.contacts?.profile_picture_url && (
                      <AvatarImage 
                        src={conversation.contacts.profile_picture_url} 
                        alt={conversation.contacts.name || "Contato"}
                        onError={async () => {
                          console.log('⚠️ Profile picture failed to load, fetching new URL');
                          const { error } = await supabase.functions.invoke('zapi-fetch-profile-picture', {
                            body: { contactId: conversation.contact_id }
                          });
                          if (!error) {
                            queryClient.invalidateQueries({ queryKey: ['conversation', selectedConversationId] });
                          }
                        }}
                      />
                    )}
                    <AvatarFallback className="text-base">
                      {(conversation.contacts?.name || "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <button
                    onClick={() => setShowContactDialog(true)}
                    className="text-left hover:opacity-80 transition-opacity"
                  >
                    <h3 className="font-semibold text-lg leading-none">
                      {conversation.contacts?.name || "Sem nome"}
                    </h3>
                  </button>
                </div>
                
                <div className="flex items-center gap-4">
                  {/* Controle de Som */}
                  <IconButton
                    icon={soundEnabled ? <VolumeX className="h-5 w-5 text-[#9CA3AF]" /> : <VolumeX className="h-5 w-5 text-[#EF4444]" />}
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    active={soundEnabled}
                    title={soundEnabled ? "Desativar alertas sonoros" : "Ativar alertas sonoros"}
                  />

                  {/* Cronômetro + Status da IA */}
                  <div className="flex items-center gap-2">
                    {/* Cronômetro (só aparece quando IA desativada temporariamente) */}
                    {!isAIActive(conversation.ai_disabled_until, conversation.contacts?.tags) && 
                     !conversation.contacts?.tags?.includes("IA Desativada") && 
                     countdown.timeLeft > 0 && (
                      <div className="flex items-center gap-1 text-xs text-[#9CA3AF] font-mono">
                        <Clock className="h-4 w-4" />
                        <span>{countdown.formatted}</span>
                      </div>
                    )}
                    
                    {/* Ícone Bot */}
                    {isAIActive(conversation.ai_disabled_until, conversation.contacts?.tags) ? (
                      // IA ATIVA: Bot verde
                      <IconButton
                        icon={<Bot className="h-6 w-6 text-[#22C55E]" />}
                        onClick={handleAssumeConversation}
                        active
                        title="IA ativa - clique para assumir conversa"
                      />
                    ) : conversation.contacts?.tags?.includes("IA Desativada") ? (
                      // IA DESATIVADA PERMANENTEMENTE: Bot cinza clicável
                      <IconButton
                        icon={<Bot className="h-6 w-6 text-[#9CA3AF]" />}
                        onClick={handleReactivateAIPermanently}
                        title="IA desativada permanentemente - clique para reativar"
                      />
                    ) : (
                      // IA DESATIVADA TEMPORARIAMENTE: Bot cinza clicável
                      <IconButton
                        icon={<Bot className="h-6 w-6 text-[#9CA3AF]" />}
                        onClick={handleReactivateAI}
                        title="IA desativada temporariamente - clique para reativar"
                      />
                    )}
                  </div>

                  {/* Desativar IA Permanentemente */}
                  {!conversation.contacts?.tags?.includes("IA Desativada") && (
                    <IconButton
                      icon={<BotOff className="h-6 w-6 text-[#EF4444]" />}
                      onClick={handleDisableAIPermanently}
                      title="Desativar IA permanentemente"
                    />
                  )}

                  {/* Favoritar */}
                  <IconButton
                    icon={
                      <Star
                        className={cn(
                          "h-6 w-6",
                          conversation.is_favorite 
                            ? "fill-[#FACC15] text-[#FACC15]" 
                            : "text-[#9CA3AF]"
                        )}
                      />
                    }
                    onClick={handleToggleFavorite}
                    active={conversation.is_favorite}
                    title={conversation.is_favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                  />
                </div>
              </div>

              <ChatMessageList conversationId={selectedConversationId} />

              <ChatInput
                conversationId={selectedConversationId}
                contactId={conversation.contact_id}
                whatsappConnectionId={conversation.whatsapp_connection_id}
                phone={conversation.contacts?.phone || ""}
                aiDisabledUntil={conversation.ai_disabled_until}
                contactTags={conversation.contacts?.tags}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center chat-area-pattern p-6">
              <div className="w-full max-w-2xl">
                {!hasConnectedWhatsApp ? (
                  <GuidedEmptyState
                    icon={PlugZap}
                    title="Conecte o WhatsApp para liberar o chat ao vivo"
                    description="Sem um número conectado, o atendimento fica vazio porque ainda não há como receber nem iniciar conversas reais por aqui."
                    badge="Canal pendente"
                    steps={[
                      "Abra a tela de conexão para parear o número da clínica por QR Code ou código.",
                      "Depois volte aqui para acompanhar mensagens, favoritos e filas humanas.",
                      "Enquanto isso, você já pode cadastrar clientes e preparar o CRM.",
                    ]}
                    actions={[
                      { label: "Conectar WhatsApp", href: "/company/settings/whatsapp" },
                      { label: "Cadastrar clientes", href: "/company/contacts/patients", variant: "outline" },
                    ]}
                  />
                ) : totalConversations === 0 ? (
                  <GuidedEmptyState
                    icon={MessageSquareOff}
                    title="Seu chat está pronto, só falta a primeira conversa"
                    description="Quando um cliente mandar mensagem, ela aparece aqui automaticamente. Você também pode puxar o primeiro atendimento pela lista lateral."
                    badge="Chat vazio"
                    steps={[
                      "Busque um cliente pelo nome ou telefone na barra lateral para iniciar uma conversa manualmente.",
                      "Se o cliente ainda não existir, cadastre o contato para não perder o contexto do atendimento.",
                      `Número conectado: ${connectedWhatsApp?.formattedPhone || connectedWhatsApp?.phone || "WhatsApp ativo"}.`,
                    ]}
                    actions={[
                      { label: "Ver clientes", href: "/company/contacts/patients" },
                      { label: "Abrir CRM", href: "/company/crm", variant: "outline" },
                    ]}
                  />
                ) : (
                  <GuidedEmptyState
                    icon={MessageCircle}
                    title="Escolha uma conversa para continuar"
                    description="Sua fila já tem atendimentos. Selecione um contato na lateral para ver mensagens, assumir a conversa ou devolver para a IA."
                    badge={`${totalConversations} conversa${totalConversations === 1 ? "" : "s"}`}
                    steps={[
                      "Favoritas ajudam a fixar clientes importantes no topo do fluxo.",
                      "Use o botão do bot para assumir manualmente quando precisar responder como humano.",
                      "Ao abrir a conversa, ela é marcada como lida automaticamente.",
                    ]}
                    compact
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dialog de confirmação para silenciar */}
      <AlertDialog open={showMuteDialog} onOpenChange={setShowMuteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Silenciar alertas urgentes?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza? Ainda há {urgentCount} conversa(s) marcada(s) como urgente que precisam de atenção.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { muteAlert(); setShowMuteDialog(false); }}>
              Sim, silenciar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de foto de perfil expandida */}
      <Dialog open={showProfilePictureDialog} onOpenChange={setShowProfilePictureDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{conversation?.contacts?.name || "Contato"}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center">
            {conversation?.contacts?.profile_picture_url ? (
              <img 
                src={conversation.contacts.profile_picture_url} 
                alt={conversation.contacts.name || "Foto de perfil"}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            ) : (
              <div className="flex items-center justify-center w-full h-64 bg-muted rounded-lg">
                <p className="text-muted-foreground">Sem foto de perfil</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de perfil do contato */}
      <ContactDialog
        open={showContactDialog}
        onOpenChange={setShowContactDialog}
        contact={conversation?.contacts}
      />
    </>
  );
};

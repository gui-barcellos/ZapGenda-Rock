import { useState } from "react";
import { useConversations, useUpdateConversationStatus, useDeleteConversation, useBlockContact } from "@/hooks/useConversations";
import { useLastMessages } from "@/hooks/useLastMessages";
import { ConversationCard } from "./ConversationCard";
import { ConversationFilters } from "./ConversationFilters";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from "@/components/ui/context-menu";
import { CheckCheck, Star, Ban, Trash2, AlertCircle } from "lucide-react";

interface ConversationsListProps {
  onSelectConversation: (conversationId: string) => void;
  selectedConversationId?: string;
}

export const ConversationsList = ({
  onSelectConversation,
  selectedConversationId,
}: ConversationsListProps) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'favorites'>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [selectedConversationForAction, setSelectedConversationForAction] = useState<{
    conversationId: string;
    contactId: string;
    contactName: string;
    isBlocked: boolean;
  } | null>(null);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useConversations(activeFilter);
  const conversations = data?.pages.flatMap(page => page.conversations) || [];
  const updateConversation = useUpdateConversationStatus();
  const deleteConversation = useDeleteConversation();
  const blockContact = useBlockContact();

  const filteredConversations = conversations?.filter((conv) => {
    const matchesSearch =
      conv.contacts?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.contacts?.phone.includes(searchTerm);
    return matchesSearch;
  });

  // Contar conversas aguardando atendimento humano
  const awaitingHumanCount = filteredConversations?.filter(conv => 
    conv.contacts?.tags?.includes("Aguardando Humano") || conv.contacts?.tags?.includes("Aguardando Resposta")
  ).length || 0;

  // Buscar previews de últimas mensagens
  const conversationIds = filteredConversations?.map(c => c.id) || [];
  const { data: lastMessages } = useLastMessages(conversationIds);

  const handleDeleteClick = (conversationId: string, contactId: string, contactName: string) => {
    setSelectedConversationForAction({ conversationId, contactId, contactName, isBlocked: false });
    setDeleteDialogOpen(true);
  };

  const handleBlockClick = (conversationId: string, contactId: string, contactName: string, isBlocked: boolean) => {
    setSelectedConversationForAction({ conversationId, contactId, contactName, isBlocked });
    setBlockDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedConversationForAction) return;
    
    await deleteConversation.mutateAsync(selectedConversationForAction.conversationId);
    setDeleteDialogOpen(false);
    setSelectedConversationForAction(null);
    
    if (selectedConversationId === selectedConversationForAction.conversationId) {
      onSelectConversation("");
    }
  };

  const confirmBlock = async () => {
    if (!selectedConversationForAction) return;
    
    await blockContact.mutateAsync({
      contactId: selectedConversationForAction.contactId,
      isBlocked: !selectedConversationForAction.isBlocked,
    });
    
    setBlockDialogOpen(false);
    setSelectedConversationForAction(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <ConversationFilters
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />
        <div className="space-y-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ConversationFilters
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      {/* Banner de alertas aguardando atendimento */}
      {awaitingHumanCount > 0 && (
        <div className="bg-orange-500/20 border-l-4 border-orange-500 p-3 mx-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500 shrink-0" />
            <span className="font-semibold text-sm">
              {awaitingHumanCount} {awaitingHumanCount === 1 ? 'cliente aguardando' : 'clientes aguardando'} atendimento humano
            </span>
          </div>
        </div>
      )}

      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div>
            <ScrollArea className="h-[calc(100vh-250px)]">
              <div className="space-y-2 pr-4">
                {filteredConversations?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma conversa encontrada
                  </div>
                ) : (
                  filteredConversations?.map((conversation) => (
                    <div
                      key={conversation.id}
                      onContextMenu={() => {
                        console.debug("[List] contextmenu on card", { id: conversation.id, name: conversation.contacts?.name });
                        setSelectedConversationForAction({
                          conversationId: conversation.id,
                          contactId: conversation.contact_id,
                          contactName: conversation.contacts?.name || "Sem nome",
                          isBlocked: conversation.contacts?.is_blocked || false,
                        });
                      }}
                    >
                      <ConversationCard
                        conversationId={conversation.id}
                        contactId={conversation.contact_id}
                        name={conversation.contacts?.name || "Sem nome"}
                        phone={conversation.contacts?.phone || ""}
                        profilePicture={conversation.contacts?.profile_picture_url}
                        status={conversation.status}
                        lastMessageAt={conversation.last_message_at}
                        isActive={conversation.id === selectedConversationId}
                        onClick={() => onSelectConversation(conversation.id)}
                        tags={conversation.contacts?.tags || []}
                        lastMessagePreview={lastMessages?.[conversation.id]?.content || ""}
                        unreadCount={conversation.is_unread ? 1 : 0}
                        isFavorite={conversation.is_favorite}
                        isBlocked={conversation.contacts?.is_blocked || false}
                        onToggleFavorite={() => {
                          updateConversation.mutate({
                            id: conversation.id,
                            status: conversation.status,
                            is_favorite: !conversation.is_favorite,
                          } as any);
                        }}
                        onToggleRead={() => {
                          updateConversation.mutate({
                            id: conversation.id,
                            status: conversation.status,
                            is_unread: !conversation.is_unread,
                          } as any);
                        }}
                        onBlock={() => {
                          setSelectedConversationForAction({
                            conversationId: conversation.id,
                            contactId: conversation.contact_id,
                            contactName: conversation.contacts?.name || "Sem nome",
                            isBlocked: conversation.contacts?.is_blocked || false,
                          });
                          setBlockDialogOpen(true);
                        }}
                        onDelete={() => {
                          setSelectedConversationForAction({
                            conversationId: conversation.id,
                            contactId: conversation.contact_id,
                            contactName: conversation.contacts?.name || "Sem nome",
                            isBlocked: conversation.contacts?.is_blocked || false,
                          });
                          setDeleteDialogOpen(true);
                        }}
                      />
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56 z-[60]">
          <ContextMenuItem onClick={() => {
            if (!selectedConversationForAction) return;
            const conv = filteredConversations?.find(c => c.id === selectedConversationForAction.conversationId);
            if (!conv) return;
            updateConversation.mutate({
              id: conv.id,
              status: conv.status,
              is_unread: false,
            } as any);
          }}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Marcar como lida
          </ContextMenuItem>

          <ContextMenuItem onClick={() => {
            if (!selectedConversationForAction) return;
            const conv = filteredConversations?.find(c => c.id === selectedConversationForAction.conversationId);
            if (!conv) return;
            updateConversation.mutate({
              id: conv.id,
              status: conv.status,
              is_favorite: !conv.is_favorite,
            } as any);
          }}>
            <Star className="mr-2 h-4 w-4" />
            Alternar favorito
          </ContextMenuItem>

          <ContextMenuSeparator />

          <ContextMenuItem onClick={() => {
            if (!selectedConversationForAction) return;
            setBlockDialogOpen(true);
          }}>
            <Ban className="mr-2 h-4 w-4" />
            {selectedConversationForAction?.isBlocked ? "Desbloquear" : "Bloquear"}
          </ContextMenuItem>

          <ContextMenuItem
            onClick={() => {
              if (!selectedConversationForAction) return;
              setDeleteDialogOpen(true);
            }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Apagar conversa
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Dialog de confirmação para deletar */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Apagar conversa?"
        description={`Todas as mensagens da conversa com ${selectedConversationForAction?.contactName} serão permanentemente deletadas. Esta ação não pode ser desfeita.`}
        isLoading={deleteConversation.isPending}
      />

      {/* Dialog de confirmação para bloquear */}
      <AlertDialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedConversationForAction?.isBlocked ? "Desbloquear contato?" : "Bloquear contato?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedConversationForAction?.isBlocked 
                ? `O contato ${selectedConversationForAction?.contactName} poderá enviar mensagens novamente.`
                : `O contato ${selectedConversationForAction?.contactName} não poderá mais enviar mensagens para você.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={blockContact.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmBlock();
              }}
              disabled={blockContact.isPending}
              className={selectedConversationForAction?.isBlocked ? "" : "bg-destructive hover:bg-destructive/90"}
            >
              {blockContact.isPending 
                ? "Processando..." 
                : (selectedConversationForAction?.isBlocked ? "Desbloquear" : "Bloquear")
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

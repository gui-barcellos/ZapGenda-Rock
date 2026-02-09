import { useRef, useState, useEffect } from "react";
import { useConversations, useUpdateConversationStatus, useDeleteConversation, useBlockContact, useCreateConversation } from "@/hooks/useConversations";
import { useContacts } from "@/hooks/useContacts";
import { useLastMessages } from "@/hooks/useLastMessages";
import { ConversationCard } from "./ConversationCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search, UserPlus, MessageCirclePlus } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Ban, CheckCheck, MoreVertical, Star, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ContactDialog from "@/components/company/ContactDialog";
import { formatPhoneDisplay, normalizePhoneWithCountryCode } from "@/lib/phone-utils";
import { useVirtualizer } from '@tanstack/react-virtual';

interface ConversationSidebarProps {
  onSelectConversation: (conversationId: string) => void;
  selectedConversationId?: string;
}

export const ConversationSidebar = ({
  onSelectConversation,
  selectedConversationId,
}: ConversationSidebarProps) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'favorites'>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [selectedConversationForAction, setSelectedConversationForAction] = useState<{
    conversationId: string;
    contactId: string;
    contactName: string;
    isBlocked: boolean;
  } | null>(null);

  const { 
    data, 
    isLoading, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useConversations(activeFilter);
  
  const { data: allContacts } = useContacts();
  const updateConversation = useUpdateConversationStatus();
  const deleteConversation = useDeleteConversation();
  const blockContact = useBlockContact();
  const createConversation = useCreateConversation();

  const parentRef = useRef<HTMLDivElement>(null);

  // Flatten páginas para array único
  const conversations = data?.pages.flatMap(page => page.conversations) || [];

  // Filtrar conversas por busca
  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch =
      conv.contacts?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.contacts?.phone.includes(searchTerm);
    return matchesSearch;
  });

  // Buscar previews de últimas mensagens
  const conversationIds = filteredConversations.map(c => c.id);
  const { data: lastMessages } = useLastMessages(conversationIds);

  // Virtual scrolling
  const rowVirtualizer = useVirtualizer({
    count: filteredConversations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 5,
  });

  // Carregar mais ao chegar no fim
  useEffect(() => {
    const lastItem = rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1];
    
    if (
      lastItem &&
      lastItem.index >= filteredConversations.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  }, [
    hasNextPage,
    fetchNextPage,
    filteredConversations.length,
    isFetchingNextPage,
    rowVirtualizer.getVirtualItems(),
  ]);

  // Buscar contatos sem conversa
  const allContactsArray = allContacts?.contacts || [];
  const contactsWithoutConversation = allContactsArray.filter(contact => 
    !conversations.some(conv => conv.contact_id === contact.id) &&
    (contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     contact.phone.includes(searchTerm))
  );

  // Detectar se é telefone
  const isPhoneInput = (input: string): boolean => {
    const digitsOnly = input.replace(/\D/g, '');
    return digitsOnly.length >= 10 && digitsOnly.length <= 13;
  };

  const isSearchPhone = searchTerm && isPhoneInput(searchTerm);
  const normalizedSearchPhone = isSearchPhone ? normalizePhoneWithCountryCode(searchTerm) : null;
  const contactWithPhone = normalizedSearchPhone 
    ? allContactsArray.find(c => c.phone === normalizedSearchPhone)
    : null;

  const handleStartConversationWithPhone = async () => {
    if (!normalizedSearchPhone) return;

    try {
      const formattedPhone = formatPhoneDisplay(normalizedSearchPhone);
      
      // Criar contato temporário
      const { data: newContact } = await supabase
        .from('contacts')
        .insert({
          phone: normalizedSearchPhone,
          name: formattedPhone,
        })
        .select()
        .single();

      if (!newContact) throw new Error("Erro ao criar contato");

      // Criar conversa
      const conversation = await createConversation.mutateAsync(newContact.id);
      
      // Abrir conversa
      if (conversation) {
        onSelectConversation(conversation.id);
        setSearchTerm("");
      }
    } catch (error) {
      console.error("Erro ao iniciar conversa:", error);
    }
  };

  const handleStartConversation = async (contactId: string) => {
    try {
      const conversation = await createConversation.mutateAsync(contactId);
      if (conversation) {
        onSelectConversation(conversation.id);
        setSearchTerm("");
      }
    } catch (error) {
      console.error("Erro ao iniciar conversa:", error);
    }
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
      <div className="w-96 border-r border-border bg-background flex flex-col h-full">
        <div className="p-3 border-b border-border space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-96 border-r border-border bg-background flex flex-col h-full">
      {/* Search bar - FIXA */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas ou contatos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-muted/30 border-0 h-10"
          />
        </div>
      </div>

      {/* Filter tabs - FIXAS */}
      <div className="border-b border-border">
        <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as any)} className="w-full">
          <TabsList className="w-full grid grid-cols-3 h-12 bg-transparent rounded-none">
            <TabsTrigger value="all" className="text-xs">Todas</TabsTrigger>
            <TabsTrigger value="unread" className="text-xs">Não Lidas</TabsTrigger>
            <TabsTrigger value="favorites" className="text-xs">Favoritas</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Lista de conversas - SCROLLÁVEL COM VIRTUAL */}
      <div ref={parentRef} className="flex-1 overflow-y-auto">
        {searchTerm && (
          <>
            {/* Conversas Ativas */}
            {filteredConversations.length > 0 && (
              <div>
                <div className="px-4 py-2 text-xs font-semibold text-muted-foreground bg-muted/30">
                  Conversas Ativas
                </div>
                <div
                  style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                  }}
                >
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const conversation = filteredConversations[virtualRow.index];
                    return (
                      <div
                        key={conversation.id}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                        className="group/card"
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
                    );
                  })}
                </div>
              </div>
            )}

            {/* Iniciar Nova Conversa */}
            {contactsWithoutConversation.length > 0 && (
              <div>
                <div className="px-4 py-2 text-xs font-semibold text-muted-foreground bg-muted/30">
                  Iniciar Nova Conversa
                </div>
                {contactsWithoutConversation.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => handleStartConversation(contact.id)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-accent/30 cursor-pointer transition-colors border-b border-border"
                  >
                    <MessageCirclePlus className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{contact.name}</p>
                      <p className="text-xs text-muted-foreground">{formatPhoneDisplay(contact.phone)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Não encontrado - Opções unificadas */}
            {filteredConversations.length === 0 && contactsWithoutConversation.length === 0 && (
              <div>
                <div className="px-4 py-2 text-xs font-semibold text-muted-foreground bg-muted/30">
                  Não encontrado
                </div>
                
                {isSearchPhone && !contactWithPhone && (
                  <div
                    onClick={handleStartConversationWithPhone}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-primary/20 cursor-pointer transition-colors border-b border-border/50 bg-primary/10 border-l-4 border-l-primary"
                  >
                    <MessageCirclePlus className="h-8 w-8 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground">
                        Iniciar conversa com
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {normalizedSearchPhone && formatPhoneDisplay(normalizedSearchPhone)}
                      </p>
                    </div>
                  </div>
                )}

                <div
                  onClick={() => setShowContactDialog(true)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-accent/30 cursor-pointer transition-colors border-b border-border"
                >
                  <UserPlus className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      Cadastrar novo contato
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Adicionar com informações completas
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {!searchTerm && (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const conversation = filteredConversations[virtualRow.index];
              return (
                <div
                  key={conversation.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="group/card"
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
              );
            })}
          </div>
        )}

        {isFetchingNextPage && (
          <div className="p-4 text-center">
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {!searchTerm && filteredConversations.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            Nenhuma conversa encontrada
          </div>
        )}
      </div>

      <ContactDialog open={showContactDialog} onOpenChange={setShowContactDialog} />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Apagar conversa?"
        description={`Todas as mensagens da conversa com ${selectedConversationForAction?.contactName} serão permanentemente deletadas. Esta ação não pode ser desfeita.`}
        isLoading={deleteConversation.isPending}
      />

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

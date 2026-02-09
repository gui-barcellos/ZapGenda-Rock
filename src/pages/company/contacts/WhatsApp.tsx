import { useState } from "react";
import CompanyLayout from "@/components/layout/CompanyLayout";
import { Card } from "@/components/ui/card";
import { ConversationsList } from "@/components/whatsapp/ConversationsList";
import { ChatMessageList } from "@/components/whatsapp/ChatMessageList";
import { Button } from "@/components/ui/button";
import { useConversation, useUpdateConversationStatus } from "@/hooks/useConversations";
import { useConversationRealtime } from "@/hooks/useConversationRealtime";
import { useMessageFallback } from "@/hooks/useMessageFallback";
import { supabase } from "@/integrations/supabase/client";
import { Bot, User } from "lucide-react";

const WhatsApp = () => {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const { data: conversation } = useConversation(selectedConversationId);
  const { lastEventTimeRef } = useConversationRealtime(selectedConversationId);
  useMessageFallback(selectedConversationId, lastEventTimeRef); // Fallback polling inteligente
  const updateStatus = useUpdateConversationStatus();

  const handleTransferToHuman = async () => {
    if (!selectedConversationId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await updateStatus.mutateAsync({
      id: selectedConversationId,
      status: "human",
      assigned_to_user_id: user.id,
    });
  };

  const handleTransferToAI = async () => {
    if (!selectedConversationId) return;
    await updateStatus.mutateAsync({
      id: selectedConversationId,
      status: "ai",
      assigned_to_user_id: null,
    });
  };

  return (
    <CompanyLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contatos WhatsApp</h1>
          <p className="text-muted-foreground mt-2">
            Visualize e gerencie todas as conversas do WhatsApp
          </p>
        </div>

        <div className="grid grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          <Card className="col-span-1 p-4">
            <ConversationsList
              onSelectConversation={setSelectedConversationId}
              selectedConversationId={selectedConversationId}
            />
          </Card>

          <Card className="col-span-2 flex flex-col">
            {selectedConversationId && conversation ? (
              <>
                <div className="border-b p-4 bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">
                        {conversation.contacts?.name || "Sem nome"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {conversation.contacts?.phone}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {conversation.status === "ai" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleTransferToHuman}
                          disabled={updateStatus.isPending}
                        >
                          <User className="h-4 w-4 mr-2" />
                          Transferir para Humano
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleTransferToAI}
                          disabled={updateStatus.isPending}
                        >
                          <Bot className="h-4 w-4 mr-2" />
                          Transferir para IA
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                <ChatMessageList conversationId={selectedConversationId} />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Selecione uma conversa para visualizar o histórico
              </div>
            )}
          </Card>
        </div>
      </div>
    </CompanyLayout>
  );
};

export default WhatsApp;

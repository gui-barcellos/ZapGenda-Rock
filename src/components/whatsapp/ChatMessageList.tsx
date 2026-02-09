import { useMessages } from "@/hooks/useMessages";
import { MessageBubble } from "./MessageBubble";
import { useEffect, useRef, useCallback } from "react";
import { Skeleton } from "../ui/skeleton";
import { useCompanySettings } from "@/contexts/CompanySettingsContext";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatMessageListProps {
  conversationId: string | null;
}

export const ChatMessageList = ({ conversationId }: ChatMessageListProps) => {
  const { data: messages, isLoading } = useMessages(conversationId);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const { primaryColor } = useCompanySettings();

  // Scroll to last message
  const scrollToLastMessage = useCallback(() => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(scrollToLastMessage, 100);
    return () => clearTimeout(timer);
  }, [messages?.length, scrollToLastMessage]);

  if (!conversationId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Selecione uma conversa para começar
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-16 w-3/4" />
        <Skeleton className="h-16 w-3/4 ml-auto" />
        <Skeleton className="h-16 w-3/4" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden">
      <ScrollArea className="h-full chat-area-pattern">
        <div className="p-4">
        {messages?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma mensagem nesta conversa
          </div>
        ) : (
          <>
            {messages?.map((message) => (
              <MessageBubble
                key={message.id}
                content={message.content}
                direction={message.direction as "inbound" | "outbound"}
                createdAt={message.created_at}
                readAt={message.read_at}
                primaryColor={primaryColor}
                isAutomatic={message.direction === "outbound" && !message.sent_by_user_id}
              />
            ))}
            <div ref={lastMessageRef} />
          </>
        )}
        </div>
      </ScrollArea>
    </div>
  );
};

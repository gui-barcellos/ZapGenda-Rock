import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useTicketMessages, useSendMessage, type SupportTicket } from "@/hooks/useSupportTickets";
import { TicketStatusBadge } from "./TicketStatusBadge";
import { TicketPriorityBadge } from "./TicketPriorityBadge";
import { format } from "date-fns";
import { Send } from "lucide-react";

interface TicketDetailsDialogProps {
  ticket: SupportTicket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TicketDetailsDialog = ({
  ticket,
  open,
  onOpenChange,
}: TicketDetailsDialogProps) => {
  const [message, setMessage] = useState("");
  const { messages, isLoading } = useTicketMessages(ticket?.id || null);
  const sendMessage = useSendMessage();

  const handleSendMessage = async () => {
    if (!ticket || !message.trim()) return;

    await sendMessage.mutateAsync({
      ticketId: ticket.id,
      content: message,
    });
    setMessage("");
  };

  if (!ticket) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="space-y-2">
            <DialogTitle>{ticket.subject}</DialogTitle>
            <div className="flex gap-2">
              <TicketStatusBadge status={ticket.status} />
              <TicketPriorityBadge priority={ticket.priority} />
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {ticket.description && (
            <div className="p-4 bg-muted/50 rounded-lg mb-4">
              <p className="text-sm text-muted-foreground">{ticket.description}</p>
            </div>
          )}

          <Separator className="my-4" />

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {isLoading ? (
                <p className="text-sm text-muted-foreground text-center">
                  Carregando mensagens...
                </p>
              ) : messages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center">
                  Nenhuma mensagem ainda
                </p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-3 rounded-lg bg-muted/30 border"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(msg.created_at), "dd/MM/yyyy HH:mm")}
                      </span>
                      {msg.is_internal && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-700 px-2 py-0.5 rounded">
                          Interno
                        </span>
                      )}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          <div className="mt-4 flex gap-2">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              rows={3}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || sendMessage.isPending}
              size="icon"
              className="self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
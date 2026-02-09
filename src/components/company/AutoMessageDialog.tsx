import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useAutoMessages, type AutoMessage } from "@/hooks/useAutoMessages";

interface AutoMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message?: AutoMessage;
}

export function AutoMessageDialog({
  open,
  onOpenChange,
  message,
}: AutoMessageDialogProps) {
  const { createMessage, updateMessage } = useAutoMessages();
  const [messageType, setMessageType] = useState(message?.message_type || "");
  const [content, setContent] = useState(message?.content || "");
  const [isActive, setIsActive] = useState(message?.is_active ?? true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (message) {
      updateMessage.mutate(
        {
          id: message.id,
          message_type: messageType,
          content,
          is_active: isActive,
        },
        {
          onSuccess: () => {
            onOpenChange(false);
          },
        }
      );
    } else {
      createMessage.mutate(
        {
          message_type: messageType,
          content,
          is_active: isActive,
        },
        {
          onSuccess: () => {
            onOpenChange(false);
            setMessageType("");
            setContent("");
            setIsActive(true);
          },
        }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>
            {message ? "Editar Mensagem" : "Nova Mensagem Automática"}
          </DialogTitle>
          <DialogDescription>
            Configure uma mensagem automática para ser enviada
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="messageType">Tipo de Mensagem</Label>
              <Input
                id="messageType"
                value={messageType}
                onChange={(e) => setMessageType(e.target.value)}
                placeholder="Ex: confirmacao_agendamento"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Conteúdo</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Digite o conteúdo da mensagem..."
                rows={6}
                required
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="isActive">Mensagem Ativa</Label>
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createMessage.isPending || updateMessage.isPending}
            >
              {createMessage.isPending || updateMessage.isPending
                ? "Salvando..."
                : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

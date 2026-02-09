import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { CheckCheck, Star, Ban, Trash2 } from "lucide-react";

interface ConversationContextMenuProps {
  children: React.ReactNode;
  isUnread: boolean;
  isFavorite: boolean;
  isBlocked: boolean;
  onToggleRead: () => void;
  onToggleFavorite: () => void;
  onBlock: () => void;
  onDelete: () => void;
}

export const ConversationContextMenu = ({
  children,
  isUnread,
  isFavorite,
  isBlocked,
  onToggleRead,
  onToggleFavorite,
  onBlock,
  onDelete,
}: ConversationContextMenuProps) => {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={onToggleRead}>
          <CheckCheck className="mr-2 h-4 w-4" />
          {isUnread ? "Marcar como lida" : "Marcar como não lida"}
        </ContextMenuItem>
        
        <ContextMenuItem onClick={onToggleFavorite}>
          <Star className="mr-2 h-4 w-4" />
          {isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        </ContextMenuItem>
        
        <ContextMenuSeparator />
        
        <ContextMenuItem onClick={onBlock}>
          <Ban className="mr-2 h-4 w-4" />
          {isBlocked ? "Desbloquear" : "Bloquear"}
        </ContextMenuItem>
        
        <ContextMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Apagar conversa
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

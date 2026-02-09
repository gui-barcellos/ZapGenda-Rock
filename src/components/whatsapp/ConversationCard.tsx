import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge } from "./StatusBadge";
import { cn } from "@/lib/utils";
import { Ban, MoreVertical, CheckCheck, Star, Trash2, Hourglass } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface ConversationCardProps {
  name: string;
  phone: string;
  profilePicture?: string;
  status: string;
  lastMessageAt: string | null;
  isActive?: boolean;
  onClick?: () => void;
  tags?: string[];
  lastMessagePreview?: string;
  unreadCount?: number;
  conversationId: string;
  contactId: string;
  isFavorite: boolean;
  isBlocked: boolean;
  onToggleFavorite: () => void;
  onToggleRead: () => void;
  onBlock: () => void;
  onDelete: () => void;
}

export const ConversationCard = ({
  name,
  phone,
  profilePicture,
  status,
  lastMessageAt,
  isActive,
  onClick,
  tags = [],
  lastMessagePreview = "",
  unreadCount = 0,
  conversationId,
  contactId,
  isFavorite,
  isBlocked,
  onToggleFavorite,
  onToggleRead,
  onBlock,
  onDelete,
}: ConversationCardProps) => {
  const queryClient = useQueryClient();
  const hasUrgent = tags.includes("Urgente");
  const hasAwaitingHuman = tags.includes("Aguardando Humano");
  const hasAwaitingResponse = tags.includes("Aguardando Resposta");
  
  const alertColor = hasUrgent ? "bg-red-500" : 
                     hasAwaitingHuman ? "bg-orange-500" : 
                     hasAwaitingResponse ? "bg-yellow-500" : null;

  const getRelativeTime = (date: string | null) => {
    if (!date) return "";
    try {
      return formatDistanceToNow(new Date(date), { locale: ptBR, addSuffix: true });
    } catch {
      return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
    }
  };

  return (
    <div
      className={cn(
        "group p-3 cursor-pointer transition-all duration-200 relative border-b border-border/50",
        "hover:bg-accent/30",
        isActive && "bg-accent/50"
      )}
      onClick={onClick}
      onContextMenu={(e) => {
        console.debug("[Card] contextmenu", { name, conversationId });
      }}
    >
      {alertColor && (
        <div 
          className={cn(
            "absolute top-2 left-2 w-2 h-2 rounded-full",
            alertColor,
            hasUrgent && "animate-pulse"
          )} 
        />
      )}
      
      {/* Badge grande "AGUARDANDO" */}
      {hasAwaitingHuman && (
        <div className="absolute top-0 right-0 bg-orange-500 text-white px-2 py-1 text-[10px] font-bold rounded-bl">
          AGUARDANDO
        </div>
      )}
      
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12 shrink-0">
          {profilePicture && (
            <AvatarImage 
              src={profilePicture} 
              alt={name}
              onError={async () => {
                console.log('⚠️ Profile picture failed to load for contact:', contactId);
                try {
                  await supabase.functions.invoke('zapi-fetch-profile-picture', {
                    body: { contactId }
                  });
                  // Invalidar query para atualizar a lista com a nova foto
                  queryClient.invalidateQueries({ queryKey: ['conversations'] });
                } catch (error) {
                  console.error('Error fetching profile picture:', error);
                }
              }}
            />
          )}
          <AvatarFallback className="text-base font-semibold">
            {name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {/* Ampulheta - Aguardando Resposta */}
              {hasAwaitingResponse && (
                <Hourglass className="h-4 w-4 text-[#F59E0B] animate-pulse shrink-0" />
              )}
              
              <h3 className="font-semibold text-sm leading-tight">{name}</h3>
            </div>
            
            <div className="flex items-center gap-1">
              {lastMessageAt && (
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                  {getRelativeTime(lastMessageAt)}
                </span>
              )}
              {isBlocked && (
                <Ban className="h-4 w-4 text-destructive shrink-0" />
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="Ações da conversa"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 rounded hover:bg-muted/50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity shrink-0"
                  >
                    <MoreVertical className="h-4 w-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" sideOffset={4} className="w-56 z-[60]">
                  <DropdownMenuItem
                    onClick={(e) => { e.stopPropagation(); onToggleRead(); }}
                  >
                    <CheckCheck className="mr-2 h-4 w-4" />
                    {unreadCount > 0 ? "Marcar como lida" : "Marcar como não lida"}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
                  >
                    <Star className="mr-2 h-4 w-4" />
                    {isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={(e) => { e.stopPropagation(); onBlock(); }}
                  >
                    <Ban className="mr-2 h-4 w-4" />
                    {isBlocked ? "Desbloquear" : "Bloquear"}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Apagar conversa
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          <div className="flex items-center justify-between gap-2 mt-0.5">
            {lastMessagePreview && (
              <p className="text-xs text-muted-foreground truncate flex-1">
                {lastMessagePreview}
              </p>
            )}
            
            {unreadCount > 0 && (
              <div className="bg-primary text-primary-foreground rounded-full h-5 min-w-5 px-1.5 flex items-center justify-center text-[10px] font-semibold shrink-0">
                {unreadCount}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

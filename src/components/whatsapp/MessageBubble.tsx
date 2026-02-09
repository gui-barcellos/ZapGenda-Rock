import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  content: string;
  direction: "inbound" | "outbound";
  createdAt: string;
  readAt: string | null;
  primaryColor?: string;
  isAutomatic?: boolean;
}

const getMessageColor = (primaryColor?: string) => {
  if (!primaryColor) return undefined;
  
  // Converter hex para RGB, usar opacidade para tom mais suave
  const hex = primaryColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return {
    backgroundColor: `rgba(${r}, ${g}, ${b}, 0.85)`,
    color: '#ffffff'
  };
};

export const MessageBubble = ({ content, direction, createdAt, readAt, primaryColor, isAutomatic }: MessageBubbleProps) => {
  const isOutbound = direction === "outbound";

  return (
    <div className={cn("flex mb-1", isOutbound ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[70%] rounded-lg px-3 py-2 shadow-sm relative",
          isOutbound 
            ? "rounded-br-sm" 
            : "bg-white text-foreground rounded-bl-sm"
        )}
        style={isOutbound ? { backgroundColor: "#d9fdd3" } : undefined}
      >
        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed mb-3">{content}</p>
        <div className={cn("flex items-center gap-1 text-[10px] absolute bottom-1 right-2", isOutbound ? "text-gray-600" : "text-gray-500")}>
          {isOutbound && isAutomatic && (
            <span className="px-1 rounded bg-muted text-[9px] uppercase">
              auto
            </span>
          )}
          <span>
            {format(new Date(createdAt), "HH:mm", { locale: ptBR })}
          </span>
          {isOutbound && (
            <span>
              {readAt ? (
                <CheckCheck className="h-3 w-3" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

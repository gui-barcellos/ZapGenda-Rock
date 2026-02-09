import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff } from "lucide-react";
import { useCompanyWhatsAppConnection } from "@/hooks/useWhatsAppConnections";

export const WhatsAppStatusBadge = () => {
  const { data: connection, isLoading } = useCompanyWhatsAppConnection();

  // Não renderizar enquanto carrega para evitar flash
  if (isLoading || !connection) return null;

  // Status vem 100% do banco (atualizado por webhooks + cron verify-whatsapp-connections)
  const isConnected = connection.is_connected ?? false;

  return (
    <Badge 
      variant={isConnected ? "default" : "destructive"}
      className="gap-1.5"
    >
      {isConnected ? (
        <>
          <Wifi className="h-3 w-3" />
          Online
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          Offline
        </>
      )}
    </Badge>
  );
};

import { useEffect } from "react";
import { AlertCircle, WifiOff } from "lucide-react";
import { Link } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useCompanyWhatsAppConnection, useValidateZAPIConnection } from "@/hooks/useWhatsAppConnections";

export const WhatsAppAlert = () => {
  const { data: connection } = useCompanyWhatsAppConnection();
  const { mutate: validate, data: validation } = useValidateZAPIConnection();

  useEffect(() => {
    if (!connection) return;

    // Validar imediatamente
    validate({
      instanceId: connection.z_api_instance_id,
      token: connection.z_api_token,
      clientToken: connection.z_api_client_token,
      verbose: false,
      ignoreClientToken: false,
    });

    // Revalidar a cada 30 segundos
    const interval = setInterval(() => {
      validate({
        instanceId: connection.z_api_instance_id,
        token: connection.z_api_token,
        clientToken: connection.z_api_client_token,
        verbose: false,
        ignoreClientToken: false,
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [connection?.id]);

  // Mostrar alerta somente quando a validação REAL indicar desconexão.
  if (!connection) return null;
  const showAlert = validation ? !validation.connected : !connection.is_connected;
  if (!showAlert) return null;

  return (
    <Alert 
      variant="destructive" 
      className="rounded-none border-x-0 border-t-0 mb-0 animate-pulse"
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <WifiOff className="h-5 w-5" />
          <AlertDescription className="text-base font-semibold">
            ⚠️ WhatsApp desconectado - Entre em contato com Guilherme para reconectar
          </AlertDescription>
        </div>
        <Link to="/company/settings/whatsapp">
          <Button 
            variant="outline" 
            size="sm"
            className="bg-white hover:bg-gray-100 text-red-600 border-red-200 font-semibold"
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            Ver Detalhes
          </Button>
        </Link>
      </div>
    </Alert>
  );
};

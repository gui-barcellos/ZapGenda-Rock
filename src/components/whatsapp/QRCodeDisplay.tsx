import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, QrCode } from "lucide-react";

interface QRCodeDisplayProps {
  qrcode: string;
  onRetest?: () => void;
  isRetesting?: boolean;
}

export function QRCodeDisplay({ qrcode, onRetest, isRetesting }: QRCodeDisplayProps) {
  return (
    <Card className="border-primary/50 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <QrCode className="h-4 w-4" />
          QR Code para Conexão WhatsApp
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center">
          <img 
            src={`data:image/png;base64,${qrcode}`} 
            alt="QR Code Z-API"
            className="w-64 h-64 border-4 border-primary/20 rounded-lg"
          />
        </div>
        
        <div className="bg-muted/50 p-3 rounded-md space-y-2">
          <p className="text-xs font-semibold">📱 Como conectar:</p>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Abra o WhatsApp no seu celular</li>
            <li>Toque em <strong>Mais opções</strong> (⋮) ou <strong>Configurações</strong></li>
            <li>Selecione <strong>Aparelhos conectados</strong></li>
            <li>Toque em <strong>Conectar um aparelho</strong></li>
            <li>Aponte a câmera para este QR code</li>
          </ol>
        </div>

        {onRetest && (
          <Button 
            onClick={onRetest} 
            disabled={isRetesting}
            className="w-full"
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRetesting ? 'animate-spin' : ''}`} />
            {isRetesting ? 'Testando...' : 'Testar Novamente'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const WEBHOOK_URL = "https://bqrqyljspwruxabbonml.supabase.co/functions/v1/zapi-webhook-receiver";

export function WebhookURLDisplay() {
  const handleCopy = () => {
    navigator.clipboard.writeText(WEBHOOK_URL);
    toast.success("URL copiada!");
  };

  return (
    <Card className="bg-muted/50">
      <CardHeader>
        <CardTitle className="text-sm">📡 Configure o Webhook na Z-API</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground mb-2">
            Cole esta URL no painel Z-API em "Webhooks e configurações gerais"
          </p>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={WEBHOOK_URL}
              className="font-mono text-xs"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopy}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md border border-blue-200 dark:border-blue-800">
        <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-2">
          Eventos necessários:
        </p>
        <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
          <li>✅ <strong>Ao receber</strong> - receber mensagens dos clientes</li>
          <li>✅ <strong>Ao conectar</strong> - atualizar status da conexão</li>
          <li>✅ <strong>Ao desconectar</strong> - atualizar status da conexão</li>
        </ul>
        
        <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-2 mt-3">
          Opcionais (recomendados):
        </p>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>⚪ Receber status da mensagem - mostrar checks de leitura</li>
        </ul>
        
        <p className="text-xs font-semibold text-red-900 dark:text-red-100 mb-2 mt-3">
          Não marcar (não necessários):
        </p>
        <ul className="text-xs text-red-800 dark:text-red-200 space-y-1">
          <li>❌ <strong>Ao enviar</strong> - não necessário</li>
          <li>❌ <strong>Presença do chat</strong> - não implementado</li>
        </ul>
        
        <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded">
          <p className="text-xs font-semibold text-amber-900 dark:text-amber-100">
            ⚠️ Deixe DESATIVADO o toggle "Notificar as enviadas por mim também"
          </p>
        </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-md border border-slate-200 dark:border-slate-800 mt-4">
          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-2">
            🔧 Troubleshooting Comum
          </p>
          <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-2">
            <li><strong>Erro 401/403:</strong> Verifique suas credenciais (Instance ID, Token, Client Token)</li>
            <li><strong>Erro 400:</strong> Revise Instance ID e Token. Se mensagem incluir "Client Token required", preencha o campo Client Token</li>
            <li><strong>QR Code aparece:</strong> Conecte seu telefone escaneando o QR code no WhatsApp</li>
            <li><strong>"You are not connected":</strong> Aparelho não está conectado à instância Z-API</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

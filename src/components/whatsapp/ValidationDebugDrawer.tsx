import { useState } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DebugInfo {
  statusEndpoint?: {
    url: string;
    statusCode: number;
    responseHeaders: Record<string, string>;
    responseBody: string;
  };
  phoneEndpoint?: {
    url: string;
    statusCode: number;
    responseHeaders: Record<string, string>;
    responseBody: string;
  };
}

interface ValidationDebugDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debug?: DebugInfo;
  hints?: string[];
}

const maskSecret = (key: string, value: string) => {
  const lowerKey = key.toLowerCase();
  if (lowerKey.includes('token') || lowerKey.includes('authorization')) {
    if (value.length < 10) return '***';
    return value.slice(0, 6) + '...' + value.slice(-3);
  }
  return value;
};

export function ValidationDebugDrawer({ open, onOpenChange, debug, hints }: ValidationDebugDrawerProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    toast.success("Copiado!");
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const formatJson = (text: string) => {
    try {
      const parsed = JSON.parse(text);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return text;
    }
  };

  const renderEndpointDetails = (endpoint: DebugInfo['statusEndpoint'], name: string) => {
    if (!endpoint) return null;

    const isSuccess = endpoint.statusCode >= 200 && endpoint.statusCode < 300;
    const isClientError = endpoint.statusCode >= 400 && endpoint.statusCode < 500;
    const isServerError = endpoint.statusCode >= 500;

    return (
      <div className="space-y-4">
        {/* Status Code */}
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            Status Code
            {isSuccess && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            {(isClientError || isServerError) && <XCircle className="h-4 w-4 text-destructive" />}
          </h4>
          <Badge variant={isSuccess ? "default" : "destructive"}>
            {endpoint.statusCode}
          </Badge>
        </div>

        {/* URL */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold">URL</h4>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleCopy(endpoint.url, `${name}-url`)}
            >
              {copiedSection === `${name}-url` ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
            {endpoint.url}
          </pre>
        </div>

        {/* Headers */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold">Headers de Resposta</h4>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleCopy(JSON.stringify(endpoint.responseHeaders, null, 2), `${name}-headers`)}
            >
              {copiedSection === `${name}-headers` ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto max-h-40">
            {Object.entries(endpoint.responseHeaders).map(([key, value]) => (
              <div key={key}>
                <span className="text-primary">{key}</span>: {maskSecret(key, value)}
              </div>
            ))}
          </pre>
        </div>

        {/* Response Body */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold">Corpo da Resposta</h4>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleCopy(formatJson(endpoint.responseBody), `${name}-body`)}
            >
              {copiedSection === `${name}-body` ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto max-h-60">
            {formatJson(endpoint.responseBody)}
          </pre>
        </div>
      </div>
    );
  };

  const allDetails = `
=== DETALHES TÉCNICOS DA VALIDAÇÃO Z-API ===

${hints && hints.length > 0 ? `
DICAS:
${hints.map((h, i) => `${i + 1}. ${h}`).join('\n')}
` : ''}

${debug?.statusEndpoint ? `
--- ENDPOINT: /status ---
URL: ${debug.statusEndpoint.url}
Status Code: ${debug.statusEndpoint.statusCode}

Headers de Resposta:
${JSON.stringify(debug.statusEndpoint.responseHeaders, null, 2)}

Corpo da Resposta:
${formatJson(debug.statusEndpoint.responseBody)}
` : ''}

${debug?.phoneEndpoint ? `
--- ENDPOINT: /phone-number ---
URL: ${debug.phoneEndpoint.url}
Status Code: ${debug.phoneEndpoint.statusCode}

Headers de Resposta:
${JSON.stringify(debug.phoneEndpoint.responseHeaders, null, 2)}

Corpo da Resposta:
${formatJson(debug.phoneEndpoint.responseBody)}
` : ''}
  `.trim();

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>Detalhes Técnicos da Validação</DrawerTitle>
          <DrawerDescription>
            Informações completas da comunicação com a API Z-API
          </DrawerDescription>
        </DrawerHeader>

        <div className="overflow-y-auto px-4">
          {hints && hints.length > 0 && (
            <div className="mb-4 bg-amber-50 dark:bg-amber-950 p-4 rounded-md border border-amber-200 dark:border-amber-800">
              <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-2">
                💡 Dicas e Recomendações
              </h3>
              <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1 list-disc list-inside">
                {hints.map((hint, i) => (
                  <li key={i}>{hint}</li>
                ))}
              </ul>
            </div>
          )}

          {debug && (
            <Tabs defaultValue="status" className="mb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="status">Endpoint: /status</TabsTrigger>
                <TabsTrigger value="phone" disabled={!debug.phoneEndpoint}>
                  Endpoint: /phone-number
                </TabsTrigger>
              </TabsList>
              <TabsContent value="status" className="mt-4">
                {renderEndpointDetails(debug.statusEndpoint, 'status')}
              </TabsContent>
              <TabsContent value="phone" className="mt-4">
                {renderEndpointDetails(debug.phoneEndpoint, 'phone')}
              </TabsContent>
            </Tabs>
          )}
        </div>

        <DrawerFooter>
          <Button
            variant="outline"
            onClick={() => handleCopy(allDetails, 'all')}
          >
            {copiedSection === 'all' ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            Copiar Todos os Detalhes
          </Button>
          <DrawerClose asChild>
            <Button variant="secondary">Fechar</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

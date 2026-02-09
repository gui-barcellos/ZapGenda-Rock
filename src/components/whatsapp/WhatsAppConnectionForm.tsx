import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2, CheckCircle2, XCircle, RefreshCw, Bug } from "lucide-react";
import { useCreateWhatsAppConnection, useValidateZAPIConnection } from "@/hooks/useWhatsAppConnections";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { QRCodeDisplay } from "./QRCodeDisplay";
import { ValidationDebugDrawer } from "./ValidationDebugDrawer";

const formSchema = z.object({
  name: z.string().min(1, "Nome da conexão é obrigatório"),
  phone: z.string().optional(),
  z_api_token: z.string().min(1, "Token é obrigatório"),
  z_api_instance_id: z.string().min(1, "Instance ID é obrigatório"),
  z_api_client_token: z.string().optional(),
  is_primary: z.boolean().default(false),
});

type FormData = z.infer<typeof formSchema>;

interface WhatsAppConnectionFormProps {
  onSuccess?: () => void;
}

export const WhatsAppConnectionForm = ({ onSuccess }: WhatsAppConnectionFormProps) => {
  const createConnection = useCreateWhatsAppConnection();
  const validateConnection = useValidateZAPIConnection();
  const [validationResult, setValidationResult] = useState<any>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [showDebugDrawer, setShowDebugDrawer] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phone: "",
      z_api_token: "",
      z_api_instance_id: "",
      z_api_client_token: "",
      is_primary: false,
    },
  });

  const handleValidate = async () => {
    const values = form.getValues();
    
    if (!values.z_api_instance_id || !values.z_api_token) {
      return;
    }

    try {
      const result = await validateConnection.mutateAsync({
        instanceId: values.z_api_instance_id.trim(),
        token: values.z_api_token.trim(),
        clientToken: values.z_api_client_token?.trim(),
        verbose: debugMode,
      });

      setValidationResult(result);
      
      if (result.connected && result.phone) {
        form.setValue('phone', result.phone);
      }
    } catch (error) {
      console.error('Validation error:', error);
    }
  };

  const handleTestWithoutClientToken = async () => {
    const values = form.getValues();
    
    if (!values.z_api_instance_id || !values.z_api_token) {
      return;
    }

    try {
      const result = await validateConnection.mutateAsync({
        instanceId: values.z_api_instance_id.trim(),
        token: values.z_api_token.trim(),
        ignoreClientToken: true,
        verbose: debugMode,
      });

      setValidationResult(result);
    } catch (error) {
      console.error('Validation error:', error);
    }
  };

  const onSubmit = async (data: FormData) => {
    const trimmedData = {
      ...data,
      z_api_instance_id: data.z_api_instance_id.trim(),
      z_api_token: data.z_api_token.trim(),
      z_api_client_token: data.z_api_client_token?.trim() || undefined,
    };

    await createConnection.mutateAsync(trimmedData);
    form.reset();
    setValidationResult(null);
    onSuccess?.();
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome da Conexão</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="WhatsApp Principal" onBlur={(e) => field.onChange(e.target.value.trim())} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="z_api_instance_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Instance ID</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="3D23F2D88ABC43..." onBlur={(e) => field.onChange(e.target.value.trim())} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="z_api_token"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Token da Instância</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="E7A5B1E66FAFC97..." onBlur={(e) => field.onChange(e.target.value.trim())} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="z_api_client_token"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client Token (Opcional)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Deixe vazio se não configurado" onBlur={(e) => field.onChange(e.target.value.trim())} />
                </FormControl>
                <FormDescription className="text-xs">
                  Apenas se configurado no painel Z-API
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="debugMode" 
              checked={debugMode}
              onCheckedChange={(checked) => setDebugMode(checked as boolean)}
            />
            <label htmlFor="debugMode" className="text-sm cursor-pointer flex items-center gap-2">
              <Bug className="h-4 w-4" />
              Modo Debug
            </label>
          </div>

          {validationResult && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {validationResult.connected ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="text-sm font-medium">Conectado</span>
                    {validationResult.phone && (
                      <Badge variant="outline">{validationResult.phone}</Badge>
                    )}
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-destructive" />
                    <span className="text-sm font-medium">Não conectado</span>
                  </>
                )}
              </div>

              {validationResult.hints && validationResult.hints.length > 0 && (
                <Alert>
                  <AlertDescription>
                    <ul className="text-xs space-y-1 list-disc list-inside">
                      {validationResult.hints.map((hint: string, i: number) => (
                        <li key={i}>{hint}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {validationResult.debug && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDebugDrawer(true)}
                >
                  <Bug className="h-4 w-4 mr-2" />
                  Ver Detalhes Técnicos
                </Button>
              )}

              {validationResult.qrcode && (
                <QRCodeDisplay 
                  qrcode={validationResult.qrcode}
                  onRetest={handleValidate}
                  isRetesting={validateConnection.isPending}
                />
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleValidate}
              disabled={validateConnection.isPending}
            >
              {validateConnection.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Testar Conexão
                </>
              )}
            </Button>

            {form.watch('z_api_client_token') && (
              <Button
                type="button"
                variant="outline"
                onClick={handleTestWithoutClientToken}
                disabled={validateConnection.isPending}
              >
                Testar Sem Client Token
              </Button>
            )}
          </div>

          <FormField
            control={form.control}
            name="is_primary"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Conexão Principal</FormLabel>
                  <FormDescription>
                    Marcar como conexão padrão para envio de mensagens
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          <Button 
            type="submit" 
            className="w-full" 
            disabled={createConnection.isPending || !validationResult?.connected}
          >
            {createConnection.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Conectando...
              </>
            ) : (
              'Salvar Conexão'
            )}
          </Button>
        </form>
      </Form>

      <ValidationDebugDrawer
        open={showDebugDrawer}
        onOpenChange={setShowDebugDrawer}
        debug={validationResult?.debug}
        hints={validationResult?.hints}
      />
    </>
  );
};

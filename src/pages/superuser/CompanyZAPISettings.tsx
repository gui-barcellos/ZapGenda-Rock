import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import SuperUserLayout from "@/components/layout/SuperUserLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, CheckCircle2, XCircle, RefreshCw, Bug } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { useCompanies } from "@/hooks/useCompanies";
import { useCompanyZAPIConnection, useSuperUserZAPI, useValidateZAPIConnection } from "@/hooks/useSuperUserZAPI";
import { WebhookURLDisplay } from "@/components/whatsapp/WebhookURLDisplay";
import { QRCodeDisplay } from "@/components/whatsapp/QRCodeDisplay";
import { ValidationDebugDrawer } from "@/components/whatsapp/ValidationDebugDrawer";

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  z_api_instance_id: z.string().min(1, "Instance ID é obrigatório"),
  z_api_token: z.string().min(1, "Token é obrigatório"),
});

type FormData = z.infer<typeof formSchema>;

const CompanyZAPISettings = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { data: companies } = useCompanies({});
  const company = companies?.find(c => c.id === companyId);
  const { data: connection, isLoading: loadingConnection } = useCompanyZAPIConnection(companyId || '');
  const { createConnection, updateConnection } = useSuperUserZAPI();
  const validateConnection = useValidateZAPIConnection();
  
  const [validationResult, setValidationResult] = useState<any>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [showDebugDrawer, setShowDebugDrawer] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      z_api_instance_id: "",
      z_api_token: "",
    },
  });

  useEffect(() => {
    if (connection) {
      form.reset({
        name: connection.name || "",
        z_api_instance_id: connection.z_api_instance_id,
        z_api_token: connection.z_api_token,
      });
      
      if (connection.is_connected && connection.phone) {
        setValidationResult({
          connected: true,
          phone: connection.phone,
        });
      }
    }
  }, [connection, form]);

  const handleValidate = async () => {
    const values = form.getValues();
    
    if (!values.z_api_instance_id || !values.z_api_token) {
      toast.error("Preencha Instance ID e Token antes de testar");
      return;
    }

    try {
      const result = await validateConnection.mutateAsync({
        instanceId: values.z_api_instance_id.trim(),
        token: values.z_api_token.trim(),
        verbose: debugMode,
      });

      setValidationResult(result);

      if (result.connected) {
        toast.success("Conexão validada com sucesso!");
      } else if (result.qrcode) {
        toast.warning("Aparelho não conectado. Escaneie o QR code.");
      } else {
        toast.error(result.error || "Falha na validação");
      }
    } catch (error: any) {
      console.error('Validation error:', error);
      toast.error("Erro ao validar conexão");
    }
  };


  const onSubmit = async (data: FormData) => {
    if (!companyId) return;

    const trimmedData = {
      name: data.name.trim(),
      z_api_instance_id: data.z_api_instance_id.trim(),
      z_api_token: data.z_api_token.trim(),
      phone: validationResult?.phone || null,
      is_connected: validationResult?.connected || false,
      is_primary: true,
    };

    try {
      if (connection?.id) {
        await updateConnection.mutateAsync({
          id: connection.id,
          companyId,
          data: trimmedData,
        });
        toast.success("Conexão atualizada com sucesso!");
      } else {
        await createConnection.mutateAsync({
          companyId,
          data: trimmedData,
        });
        toast.success("Conexão criada com sucesso!");
      }
      navigate('/superuser/companies');
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar conexão");
    }
  };

  if (!company && !loadingConnection) {
    return (
      <SuperUserLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Empresa não encontrada</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/superuser/companies')}>
            Voltar
          </Button>
        </div>
      </SuperUserLayout>
    );
  }

  return (
    <SuperUserLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/superuser/companies')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>

        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuração Z-API</h1>
          <p className="text-muted-foreground mt-2">
            {company?.name || 'Carregando...'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Credenciais Z-API</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingConnection ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
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


                      <div className="flex items-center space-x-2 pt-2">
                        <Checkbox 
                          id="debugMode" 
                          checked={debugMode}
                          onCheckedChange={(checked) => setDebugMode(checked as boolean)}
                        />
                        <label htmlFor="debugMode" className="text-sm cursor-pointer flex items-center gap-2">
                          <Bug className="h-4 w-4" />
                          Modo Debug (retorna detalhes técnicos completos)
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

                      <div className="flex gap-2 pt-2">
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
                      </div>

                      <div className="flex gap-2 pt-4 border-t">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => navigate('/superuser/companies')}
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="submit"
                          disabled={createConnection.isPending || updateConnection.isPending || !validationResult?.connected}
                        >
                          {(createConnection.isPending || updateConnection.isPending) ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Salvando...
                            </>
                          ) : (
                            'Salvar Conexão'
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <WebhookURLDisplay />
          </div>
        </div>
      </div>

      <ValidationDebugDrawer
        open={showDebugDrawer}
        onOpenChange={setShowDebugDrawer}
        debug={validationResult?.debug}
        hints={validationResult?.hints}
      />
    </SuperUserLayout>
  );
};

export default CompanyZAPISettings;

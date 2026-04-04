import { useState, useEffect } from "react";
import CompanyLayout from "@/components/layout/CompanyLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { CheckCircle2, XCircle, WifiOff, RefreshCw, QrCode, Phone } from "lucide-react";
import { useCompanyWhatsAppConnection, useValidateZAPIConnection } from "@/hooks/useWhatsAppConnections";
import { SetupGuideCard } from "@/components/company/SetupGuideCard";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

const WhatsAppConnection = () => {
  const { data: connection, isLoading } = useCompanyWhatsAppConnection();
  const validateConnection = useValidateZAPIConnection();
  const [validationResult, setValidationResult] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [isLoadingQr, setIsLoadingQr] = useState(false);
  const [qrRefreshAttempts, setQrRefreshAttempts] = useState(0);
  const [qrError, setQrError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState<string | null>(null);
  const [isRequestingCode, setIsRequestingCode] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [simulateMode, setSimulateMode] = useState(false);

  const isConnected = validationResult?.connected ?? connection?.is_connected ?? false;
  const isSimulated = import.meta.env.DEV && simulateMode;
  const simulatedQr = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <rect x="16" y="16" width="224" height="224" fill="#ffffff" stroke="#e5e7eb" stroke-width="2"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="20" fill="#111827">QR SIMULADO</text>
    </svg>`
  )}`;

  const checkStatus = async () => {
    if (!connection) return;

    setIsChecking(true);
    try {
      if (isSimulated) {
        setValidationResult({ connected: false, simulated: true });
        return;
      }
      const result = await validateConnection.mutateAsync({
        instanceId: connection.z_api_instance_id,
        token: connection.z_api_token,
        clientToken: connection.z_api_client_token,
      });
      setValidationResult(result);
    } catch (error) {
      console.error("Error checking status:", error);
    } finally {
      setIsChecking(false);
    }
  };

  const fetchQrCode = async () => {
    if (!connection) return;
    setIsLoadingQr(true);
    setQrError(null);
    try {
      if (isSimulated) {
        setQrImage(simulatedQr);
        return;
      }
      const { data, error } = await supabase.functions.invoke("zapi-qr-code", {
        body: { connection_id: connection.id },
      });
      if (error) throw error;
      if (data?.image) {
        const image = typeof data.image === "string" && data.image.startsWith("data:")
          ? data.image
          : `data:image/png;base64,${data.image}`;
        setQrImage(image);
      }
    } catch (error) {
      console.error("Error fetching QR:", error);
      setQrError("Nao foi possivel carregar o QR Code. Tente novamente.");
    } finally {
      setIsLoadingQr(false);
    }
  };

  const requestPhoneCode = async () => {
    if (!connection || !phone.trim()) return;
    const sanitizedPhone = phone.replace(/\D/g, "");
    if (sanitizedPhone.length < 10) {
      setPhoneError("Informe o numero completo com DDI.");
      return;
    }
    setIsRequestingCode(true);
    setPhoneCode(null);
    setPhoneError(null);
    try {
      if (isSimulated) {
        setPhoneCode("123-456");
        return;
      }
      const { data, error } = await supabase.functions.invoke("zapi-phone-code", {
        body: { connection_id: connection.id, phone: sanitizedPhone },
      });
      if (error) throw error;
      setPhoneCode(String(data?.code || ""));
    } catch (error) {
      console.error("Error requesting code:", error);
      setPhoneError("Nao foi possivel solicitar o codigo. Verifique o numero e tente novamente.");
    } finally {
      setIsRequestingCode(false);
    }
  };

  useEffect(() => {
    if (!connection) return;

    checkStatus();

    const interval = setInterval(() => {
      checkStatus();
    }, 60000);

    return () => clearInterval(interval);
  }, [connection?.id]);

  useEffect(() => {
    if (!connection) return;
    setQrRefreshAttempts(0);
    fetchQrCode();
  }, [connection?.id]);

  useEffect(() => {
    if (!phone) {
      setPhoneCode(null);
    }
  }, [phone]);

  useEffect(() => {
    if (!connection || isConnected) return;
    if (qrRefreshAttempts >= 3) return;

    const interval = setInterval(() => {
      setQrRefreshAttempts((prev) => {
        const next = prev + 1;
        if (next <= 3) {
          fetchQrCode();
        }
        return next;
      });
    }, 15000);

    return () => clearInterval(interval);
  }, [connection?.id, isConnected, qrRefreshAttempts]);

  if (isLoading) {
    return (
      <CompanyLayout>
        <div className="space-y-6 p-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Status WhatsApp</h1>
            <p className="text-muted-foreground mt-2">
              Monitore o status da conexao WhatsApp
            </p>
          </div>
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-4">
                <Skeleton className="h-64 w-64 rounded-lg" />
                <Skeleton className="h-6 w-32" />
              </div>
            </CardContent>
          </Card>
        </div>
      </CompanyLayout>
    );
  }

  if (!connection) {
    return (
      <CompanyLayout>
        <div className="space-y-6 p-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Status WhatsApp</h1>
            <p className="text-muted-foreground mt-2">
              Monitore o status da conexao WhatsApp
            </p>
          </div>
          <SetupGuideCard
            title="WhatsApp ainda não configurado"
            description="Sem uma conexão criada, o chat ao vivo e as automações ficam indisponíveis. Enquanto isso, você ainda pode fechar a preparação interna da clínica."
            badge="Canal pendente"
            steps={[
              {
                title: "Finalize profissionais, serviços e horários",
                description: "Assim a agenda já fica pronta mesmo antes da conexão do número.",
              },
              {
                title: "Peça a configuração da conexão",
                description: "Esta etapa ainda depende do ambiente e das credenciais da Z-API.",
              },
              {
                title: "Volte aqui para validar QR ou código",
                description: "Assim que a conexão existir, esta tela mostra as opções de pareamento.",
              },
            ]}
            actions={[
              { label: "Abrir agenda", href: "/company/schedule" },
              { label: "Revisar mensagens automáticas", href: "/company/settings/auto-messages", variant: "outline" },
            ]}
          />

          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <WifiOff className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Nenhuma conexão WhatsApp configurada</p>
                <p className="text-sm mt-2">Entre em contato com Guilherme para configurar</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </CompanyLayout>
    );
  }



  return (
    <CompanyLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Status WhatsApp</h1>
          <p className="text-muted-foreground mt-2">
            Monitore o status da conexao WhatsApp
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Status da Conexao WhatsApp</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                {isConnected ? (
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                ) : (
                  <XCircle className="h-8 w-8 text-red-500" />
                )}
                <div>
                  <p className="font-semibold text-lg">
                    {isConnected ? "WhatsApp Conectado" : "WhatsApp Desconectado"}
                  </p>
                  {isConnected && validationResult?.phone && (
                    <p className="text-sm text-muted-foreground">
                      Número conectado: {validationResult.phone}
                    </p>
                  )}
                </div>
              </div>
              <Badge variant={isConnected ? "default" : "destructive"} className="text-sm">
                {isConnected ? "ATIVO" : "INATIVO"}
              </Badge>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              {isConnected ? (
                <>
                  <p className="text-sm font-medium">Conexão ativa e funcionando</p>
                  <p className="text-xs text-muted-foreground">
                    Mensagens sendo enviadas e recebidas normalmente.
                    <br />
                    Para conectar outro número, desconecte primeiro no painel Z-API.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-destructive">
                    Conexão inativa
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Conecte seu WhatsApp usando QR Code ou número.
                  </p>
                </>
              )}
            </div>

            {import.meta.env.DEV && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Modo simulado</p>
                  <p className="text-xs text-muted-foreground">
                    Use para testar o fluxo sem credenciais da Z-API.
                  </p>
                </div>
                <Switch checked={simulateMode} onCheckedChange={setSimulateMode} />
              </div>
            )}

            {!isConnected && (
              <Tabs defaultValue="qr" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="qr" className="gap-2">
                    <QrCode className="h-4 w-4" /> QR Code
                  </TabsTrigger>
                  <TabsTrigger value="phone" className="gap-2">
                    <Phone className="h-4 w-4" /> Numero
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="qr">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Escaneie o QR Code com o WhatsApp</p>
                      <Button variant="outline" size="sm" onClick={fetchQrCode} disabled={isLoadingQr}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingQr ? 'animate-spin' : ''}`} />
                        Atualizar QR
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      O QR Code expira rapidamente. Tentamos atualizar algumas vezes automaticamente.
                    </p>
                    <div className="flex justify-center">
                      {qrImage ? (
                        <img src={qrImage} alt="QR Code" className="h-64 w-64 border rounded-lg" />
                      ) : (
                        <div className="h-64 w-64 border rounded-lg flex items-center justify-center text-xs text-muted-foreground">
                          QR Code nao disponivel
                        </div>
                      )}
                    </div>
                    {qrError && (
                      <p className="text-xs text-destructive">{qrError}</p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="phone">
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Digite o numero com DDI (ex: 5511999999999). O WhatsApp vai receber um codigo.
                    </p>
                    <div className="flex flex-col gap-2 md:flex-row md:items-center">
                      <Input
                        placeholder="5511999999999"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                      <Button onClick={requestPhoneCode} disabled={isRequestingCode}>
                        {isRequestingCode ? "Solicitando..." : "Enviar codigo"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      No WhatsApp: Dispositivos conectados &gt; Conectar com numero de telefone.
                    </p>
                    {phoneError && (
                      <p className="text-xs text-destructive">{phoneError}</p>
                    )}
                    {phoneCode && (
                      <div className="p-4 border rounded-lg bg-muted/30">
                        <p className="text-sm text-muted-foreground">Codigo:</p>
                        <p className="text-2xl font-bold tracking-widest">{phoneCode}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Digite esse codigo no WhatsApp para concluir a conexao.
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            )}

            <Button 
              onClick={checkStatus} 
              disabled={isChecking}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
              {isChecking ? 'Verificando...' : 'Verificar Status'}
            </Button>

            {validationResult && (
              <p className="text-xs text-muted-foreground text-center">
                Ultima verificacao: {new Date().toLocaleString('pt-BR')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </CompanyLayout>
  );
};

export default WhatsAppConnection;


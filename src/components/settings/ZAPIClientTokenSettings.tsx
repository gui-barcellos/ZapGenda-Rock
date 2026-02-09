import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Key, Info } from "lucide-react";
import { useZAPISettings } from "@/hooks/useZAPISettings";
import { ManageZAPIClientTokenDialog } from "./ManageZAPIClientTokenDialog";
import { useState } from "react";

export const ZAPIClientTokenSettings = () => {
  const { maskedToken, isLoading } = useZAPISettings();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Token de Segurança Z-API
          </CardTitle>
          <CardDescription>
            Token global da conta Z-API usado por todas as instâncias configuradas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isLoading && !maskedToken ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Nenhum Client Token configurado. Configure para habilitar funcionalidades avançadas da Z-API.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
              <div>
                <p className="text-sm font-medium">Client Token atual</p>
                <code className="text-xs text-muted-foreground">
                  {isLoading ? "Carregando..." : maskedToken}
                </code>
              </div>
            </div>
          )}

          <Button onClick={() => setDialogOpen(true)}>
            {maskedToken ? "Alterar Token" : "Adicionar Token"}
          </Button>
        </CardContent>
      </Card>

      <ManageZAPIClientTokenDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
};

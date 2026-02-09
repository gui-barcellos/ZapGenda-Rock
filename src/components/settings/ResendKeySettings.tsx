import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useResendSettings } from "@/hooks/useResendSettings";
import { ManageResendKeyDialog } from "./ManageResendKeyDialog";

export function ResendKeySettings() {
  const { maskedKey, settings, isLoading } = useResendSettings();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Chave Resend
          </CardTitle>
          <CardDescription>
            Configure a chave da API do Resend para envio de emails
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!maskedKey && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Nenhuma chave Resend configurada. O envio de emails nao funcionara.
              </AlertDescription>
            </Alert>
          )}

          {maskedKey && (
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <div>
                <div className="text-xs text-muted-foreground mb-1">API KEY</div>
                <div className="font-mono text-sm select-none">{maskedKey}</div>
              </div>
              <div className="text-sm text-muted-foreground">
                From: {settings?.from_email || "(nao definido)"}
              </div>
              <div className="text-sm text-muted-foreground">
                Modo teste: {settings?.test_mode ? "ativo" : "inativo"}
              </div>
              {settings?.test_mode && (
                <div className="text-sm text-muted-foreground">
                  Email de teste: {settings?.test_recipient || "(nao definido)"}
                </div>
              )}
            </div>
          )}

          <Button onClick={() => setDialogOpen(true)} disabled={isLoading}>
            {maskedKey ? "Alterar Chave" : "Adicionar Chave"}
          </Button>
        </CardContent>
      </Card>

      <ManageResendKeyDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}

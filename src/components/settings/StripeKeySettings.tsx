import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, AlertCircle } from "lucide-react";
import { useStripeSettings } from "@/hooks/useStripeSettings";
import { ManageStripeKeyDialog } from "./ManageStripeKeyDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function StripeKeySettings() {
  const { maskedKey, isLoading } = useStripeSettings();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Chave Stripe
          </CardTitle>
          <CardDescription>
            Configure a chave da API do Stripe para processar pagamentos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!maskedKey && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Nenhuma chave Stripe configurada. O processamento de pagamentos não funcionará.
              </AlertDescription>
            </Alert>
          )}

          {maskedKey && (
            <div className="rounded-lg bg-muted p-4">
              <div className="text-xs text-muted-foreground mb-1">SECRET KEY</div>
              <div className="font-mono text-sm select-none">{maskedKey}</div>
            </div>
          )}

          <Button onClick={() => setDialogOpen(true)} disabled={isLoading}>
            {maskedKey ? "Alterar Chave" : "Adicionar Chave"}
          </Button>
        </CardContent>
      </Card>

      <ManageStripeKeyDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}

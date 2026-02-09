import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Key, AlertCircle } from "lucide-react";
import { useOpenAISettings } from "@/hooks/useOpenAISettings";
import { ManageOpenAIKeyDialog } from "./ManageOpenAIKeyDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function OpenAIKeySettings() {
  const { maskedKey, isLoading } = useOpenAISettings();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Chave OpenAI
          </CardTitle>
          <CardDescription>
            Configure a chave da API da OpenAI para transcrição de áudio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!maskedKey && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Nenhuma chave OpenAI configurada. A transcrição de áudio não funcionará.
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

      <ManageOpenAIKeyDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}

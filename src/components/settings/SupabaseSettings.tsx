import { useState } from "react";
import { AlertCircle, Copy, Database } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { useSupabaseSettings } from "@/hooks/useSupabaseSettings";
import { ManageSupabaseSettingsDialog } from "./ManageSupabaseSettingsDialog";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined;
const PROJECT_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

const maskValue = (value?: string) => {
  if (!value) return "";
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

const copyValue = (value?: string, label?: string) => {
  if (!value) return;
  navigator.clipboard.writeText(value);
  toast.success(`${label || "Valor"} copiado!`);
};

export function SupabaseSettings() {
  const { settings, isLoading } = useSupabaseSettings();
  const [dialogOpen, setDialogOpen] = useState(false);

  const effectiveProjectId = settings?.project_id || PROJECT_ID || "";
  const effectiveProjectUrl = settings?.project_url || PROJECT_URL || "";
  const effectivePublishableKey = settings?.publishable_key || PUBLISHABLE_KEY || "";
  const effectiveAccessToken = settings?.access_token || "";

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Supabase
          </CardTitle>
          <CardDescription>
            Dados de conexao usados no frontend do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!settings && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Nenhuma configuracao salva. Use o botao abaixo para cadastrar.
              </AlertDescription>
            </Alert>
          )}

          {settings && !effectiveAccessToken && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Token de acesso do Supabase nÃ£o configurado. Deploy automatico via CLI nÃ£o estara disponivel.
              </AlertDescription>
            </Alert>
          )}

          <div>
            <div className="text-xs text-muted-foreground mb-1">PROJECT ID</div>
            <div className="flex items-center gap-2">
              <Input readOnly value={effectiveProjectId} className="font-mono text-xs" />
              <Button size="sm" variant="outline" onClick={() => copyValue(effectiveProjectId, "Project ID")}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">PROJECT URL</div>
            <div className="flex items-center gap-2">
              <Input readOnly value={effectiveProjectUrl} className="font-mono text-xs" />
              <Button size="sm" variant="outline" onClick={() => copyValue(effectiveProjectUrl, "Project URL")}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

        <div>
          <div className="text-xs text-muted-foreground mb-1">PUBLISHABLE KEY</div>
          <div className="flex items-center gap-2">
            <Input readOnly value={maskValue(effectivePublishableKey)} className="font-mono text-xs" />
            <Button size="sm" variant="outline" onClick={() => copyValue(effectivePublishableKey, "Publishable Key")}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div>
          <div className="text-xs text-muted-foreground mb-1">ACCESS TOKEN</div>
          <div className="flex items-center gap-2">
            <Input readOnly value={maskValue(effectiveAccessToken)} className="font-mono text-xs" />
            <Button size="sm" variant="outline" onClick={() => copyValue(effectiveAccessToken, "Access Token")}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Usado apenas para deploy via CLI. Guarde com seguranÃ§a.
          </p>
        </div>

          <Button onClick={() => setDialogOpen(true)} disabled={isLoading}>
            {settings ? "Alterar Configuracao" : "Adicionar Configuracao"}
          </Button>
        </CardContent>
      </Card>

      <ManageSupabaseSettingsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialValues={{
          projectId: effectiveProjectId,
          projectUrl: effectiveProjectUrl,
          publishableKey: effectivePublishableKey,
          accessToken: "",
        }}
      />
    </>
  );
}

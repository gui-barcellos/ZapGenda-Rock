import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { supabase, isSupabaseConfigured, missingSupabaseEnv } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface InviteValidationResult {
  valid: boolean;
  invite?: {
    email: string;
    role: string;
    companyName: string;
    status: string;
    expiresAt: string | null;
  };
}

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  attendant: "Atendente",
};

const AcceptInvite = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [loadingInvite, setLoadingInvite] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [inviteData, setInviteData] = useState<InviteValidationResult["invite"] | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const expiresAtLabel = useMemo(() => {
    if (!inviteData?.expiresAt) return null;
    return new Date(inviteData.expiresAt).toLocaleString("pt-BR");
  }, [inviteData?.expiresAt]);

  useEffect(() => {
    const validateInvite = async () => {
      if (!isSupabaseConfigured) {
        setInviteError(`Ambiente local sem Supabase configurado. Faltam: ${missingSupabaseEnv.join(", ")}.`);
        setLoadingInvite(false);
        return;
      }
      if (!token) {
        setInviteError("Convite inválido. Verifique o link recebido por email.");
        setLoadingInvite(false);
        return;
      }

      setLoadingInvite(true);

      const { data, error } = await supabase.functions.invoke("accept-user-invite", {
        body: {
          action: "validate",
          token,
        },
      });

      if (error) {
        setInviteError(error.message || "Não foi possível validar o convite.");
        setLoadingInvite(false);
        return;
      }

      const result = data as InviteValidationResult;

      if (!result?.valid || !result.invite) {
        const status = result?.invite?.status;
        const message =
          status === "accepted"
            ? "Este convite já foi aceito. Faça login para continuar."
            : status === "cancelled"
              ? "Este convite foi cancelado."
              : status === "expired"
                ? "Este convite expirou. Solicite um novo convite ao administrador."
                : "Convite inválido ou indisponível.";

        setInviteError(message);
        setInviteData(result?.invite ?? null);
        setLoadingInvite(false);
        return;
      }

      setInviteData(result.invite);
      setInviteError(null);
      setLoadingInvite(false);
    };

    validateInvite();
  }, [token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!isSupabaseConfigured) {
      toast({
        title: "Supabase não configurado",
        description: `Faltam variáveis locais: ${missingSupabaseEnv.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    if (!inviteData) return;

    if (!fullName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Informe seu nome para concluir o cadastro.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: "Senha fraca",
        description: "Use pelo menos 8 caracteres.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Senhas diferentes",
        description: "Digite a mesma senha nos dois campos.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("accept-user-invite", {
        body: {
          action: "accept",
          token,
          fullName: fullName.trim(),
          whatsapp: whatsapp.trim() || undefined,
          password,
        },
      });

      if (error) throw error;

      const accepted = data as { email: string; companyName: string };

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: accepted.email,
        password,
      });

      if (signInError) {
        toast({
          title: "Conta criada",
          description: "Seu acesso foi criado. Faça login com seu email e senha.",
        });
        navigate("/login", { replace: true });
        return;
      }

      toast({
        title: "Convite aceito",
        description: `Sua conta em ${accepted.companyName} foi criada com sucesso.`,
      });

      navigate("/company/schedule", { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Tente novamente.";
      toast({
        title: "Erro ao aceitar convite",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl">Aceitar convite</CardTitle>
          <CardDescription>
            Crie seu acesso para entrar na equipe convidada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingInvite && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Validando convite...
            </div>
          )}

          {!loadingInvite && inviteError && (
            <div className="space-y-4">
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                {inviteError}
              </div>
              <Button variant="outline" className="w-full" onClick={() => navigate("/login")}>
                Ir para login
              </Button>
            </div>
          )}

          {!loadingInvite && inviteData && !inviteError && (
            <>
              <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
                <div><strong>Empresa:</strong> {inviteData.companyName}</div>
                <div><strong>Email:</strong> {inviteData.email}</div>
                <div><strong>Permissão:</strong> {roleLabels[inviteData.role] || inviteData.role}</div>
                {expiresAtLabel && <div><strong>Expira em:</strong> {expiresAtLabel}</div>}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome completo</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Seu nome completo"
                    required
                    disabled={submitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={inviteData.email} disabled readOnly />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp (opcional)</Label>
                  <Input
                    id="whatsapp"
                    value={whatsapp}
                    onChange={(event) => setWhatsapp(event.target.value)}
                    placeholder="(11) 99999-9999"
                    disabled={submitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <PasswordInput
                    id="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Crie uma senha segura"
                    disabled={submitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar senha</Label>
                  <PasswordInput
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Repita a senha"
                    disabled={submitting}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando acesso...
                    </>
                  ) : (
                    "Aceitar convite e entrar"
                  )}
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvite;

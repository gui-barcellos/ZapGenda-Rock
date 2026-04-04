import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase, isSupabaseConfigured, missingSupabaseEnv } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    const hash = window.location.hash || "";

    if (hash.includes("type=recovery") && hash.includes("access_token")) {
      navigate(`/auth/reset${hash}`, { replace: true });
      return;
    }

    if (hash.includes("error=")) {
      const params = new URLSearchParams(hash.replace(/^#/, ""));
      const description = params.get("error_description") || "Link invalido ou expirado.";
      toast({
        title: "Link expirado",
        description: decodeURIComponent(description.replace(/\+/g, " ")),
        variant: "destructive",
      });
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [navigate, toast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isSupabaseConfigured) {
      toast({
        title: "Supabase não configurado",
        description: `Faltam variáveis locais: ${missingSupabaseEnv.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Sign in with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error("Usuário não encontrado");
      }

      // Get user role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role, company_id')
        .eq('user_id', authData.user.id)
        .single();

      if (roleError) throw roleError;

      // Redirect based on role
      if (roleData.role === 'superuser') {
        navigate('/superuser/dashboard');
      } else {
        // Check if needs to setup payment
        const { data: companyData } = await supabase
          .from('companies')
          .select('status')
          .eq('id', roleData.company_id)
          .single();

        const { data: paymentData } = await supabase
          .from('payment_methods')
          .select('id')
          .eq('company_id', roleData.company_id)
          .maybeSingle();

        const { data: invoice } = await supabase
          .from('invoices')
          .select('due_date, status')
          .eq('company_id', roleData.company_id)
          .in('status', ['open', 'overdue'])
          .order('due_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        let billingBlocked = false;
        if (invoice?.due_date) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const due = new Date(`${invoice.due_date}T00:00:00`);
          const daysPastDue = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
          billingBlocked = daysPastDue > 7;
        }

        if (billingBlocked || companyData?.status === 'suspended') {
          toast({
            title: "Plano vencido",
            description: "Serviço suspenso. Regularize o pagamento para reativar o acesso.",
            variant: "destructive",
          });
          navigate('/company/setup/payment');
        } else if (companyData?.status === 'trial' && !paymentData) {
          navigate('/company/setup/payment');
        } else {
          navigate('/company/schedule');
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Verifique suas credenciais e tente novamente.";
      toast({
        title: "Erro ao fazer login",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isSupabaseConfigured) {
      toast({
        title: "Supabase não configurado",
        description: `Faltam variáveis locais: ${missingSupabaseEnv.join(", ")}`,
        variant: "destructive",
      });
      return;
    }
    
    if (!resetEmail.trim()) {
      toast({
        title: "Email obrigatório",
        description: "Digite seu email para recuperar a senha.",
        variant: "destructive",
      });
      return;
    }

    setResetLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth/reset`,
      });

      if (error) throw error;

      toast({
        title: "Email enviado com sucesso!",
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
      });
      
      setResetDialogOpen(false);
      setResetEmail("");
    } catch (error: unknown) {
      console.error("Reset password error:", error);
      const message = error instanceof Error ? error.message : "Não foi possível enviar o email de recuperação.";
      toast({
        title: "Erro ao enviar email",
        description: message,
        variant: "destructive",
      });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="space-y-2 text-center">
          <div className="mb-4">
            <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Marca Pra Mim
            </h1>
          </div>
          <CardTitle className="text-2xl">Bem-vindo de volta</CardTitle>
          <CardDescription>
            Entre com suas credenciais para acessar o sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isSupabaseConfigured && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              Ambiente local sem Supabase configurado. Para liberar login e dados reais, crie um <code>.env.local</code> com: {missingSupabaseEnv.join(", ")}.
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <PasswordInput
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
          
          <div className="text-center">
            <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="link" className="text-sm text-muted-foreground">
                  Esqueci minha senha
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Recuperar Senha
                  </DialogTitle>
                  <DialogDescription>
                    Digite seu email para receber um link de redefinição de senha.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      disabled={resetLoading}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={resetLoading}>
                    {resetLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      "Enviar Link de Recuperação"
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;

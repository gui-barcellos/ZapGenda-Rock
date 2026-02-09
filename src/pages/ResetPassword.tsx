import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  const hashParams = useMemo(() => {
    const hash = window.location.hash.replace(/^#/, "");
    return new URLSearchParams(hash);
  }, []);

  useEffect(() => {
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    if (!accessToken || !refreshToken) {
      setSessionReady(false);
      return;
    }

    const setSession = async () => {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        toast({
          title: "Link invalido",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      setSessionReady(true);
    };

    setSession();
  }, [hashParams, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || password.length < 8) {
      toast({
        title: "Senha fraca",
        description: "Use pelo menos 8 caracteres.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirm) {
      toast({
        title: "Senhas diferentes",
        description: "Digite a mesma senha nos dois campos.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast({
        title: "Senha atualizada",
        description: "Agora voce ja pode entrar no sistema.",
      });

      navigate("/login");
    } catch (err: any) {
      toast({
        title: "Erro ao atualizar senha",
        description: err.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl">Definir nova senha</CardTitle>
          <CardDescription>
            Crie uma senha para acessar o sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!sessionReady && (
            <div className="text-sm text-muted-foreground">
              Link invalido ou expirado. Solicite um novo link de recuperacao.
            </div>
          )}

          {sessionReady && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova senha</Label>
                <PasswordInput
                  id="password"
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirmar senha</Label>
                <PasswordInput
                  id="confirm"
                  placeholder="********"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar senha"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;

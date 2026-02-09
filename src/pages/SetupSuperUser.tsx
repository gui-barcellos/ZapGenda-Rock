import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function SetupSuperUser() {
  const [email, setEmail] = useState('guilhermebarcellos@rocketmail.com');
  const [password, setPassword] = useState('MarcaPraMim@2025!Secure');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [superuserExists, setSuperuserExists] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkSuperuserExists();
  }, []);

  const checkSuperuserExists = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('id')
        .eq('role', 'superuser')
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        setSuperuserExists(true);
        toast({
          title: 'Sistema já configurado',
          description: 'O SuperUser já foi criado. Redirecionando...',
        });
        setTimeout(() => navigate('/login'), 2000);
      }
    } catch (error) {
      console.error('Error checking superuser:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Erro ao criar usuário');

      // 2. Insert superuser role (fallback to bootstrap RPC if RLS blocks)
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: 'superuser',
        });

      if (roleError) {
        const { data: bootstrapOk, error: bootstrapError } = await supabase
          .rpc('bootstrap_superuser', { p_user_id: authData.user.id });

        if (bootstrapError || !bootstrapOk) {
          throw bootstrapError || roleError;
        }
      }

      toast({
        title: 'SuperUser criado com sucesso!',
        description: 'Redirecionando para o login...',
      });

      // Sign out to force login
      await supabase.auth.signOut();

      setTimeout(() => navigate('/login'), 1500);
    } catch (error: any) {
      console.error('Error creating superuser:', error);
      toast({
        title: 'Erro ao criar SuperUser',
        description: error.message || 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (superuserExists) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sistema Configurado</CardTitle>
            <CardDescription>
              O SuperUser já foi criado. Redirecionando para o login...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Configuração Inicial</CardTitle>
          <CardDescription>
            Crie o primeiro SuperUser do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Senha
              </label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar SuperUser'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useBillingStatus } from "@/hooks/useBillingStatus";

export default function Payment() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [companyData, setCompanyData] = useState<any>(null);
  const { data: billingInfo } = useBillingStatus();

  useEffect(() => {
    loadCompanyData();
  }, []);

  const loadCompanyData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!profile?.company_id) return;

    const { data: company } = await supabase
      .from("companies")
      .select("*")
      .eq("id", profile.company_id)
      .single();

    setCompanyData(company);
  };

  const handleSetupPayment = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { company_id: profile.company_id }
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      toast.error(error.message || "Erro ao criar sessão de checkout");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigate("/company/schedule");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <CreditCard className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Configure seu Método de Pagamento</CardTitle>
          <CardDescription>
            {companyData?.status === 'trial' 
              ? `Seu período de trial termina em ${new Date(companyData.trial_end_date).toLocaleDateString('pt-BR')}. Configure seu método de pagamento para continuar usando o sistema.`
              : (companyData?.status === 'suspended' || billingInfo?.status === 'blocked')
                ? 'Plano vencido. O serviço está suspenso até a regularização do pagamento.'
                : 'Configure seu método de pagamento para ativar sua conta.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleSetupPayment} 
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Adicionar Cartão de Crédito
              </>
            )}
          </Button>
          
          {companyData?.status === 'trial' && billingInfo?.status !== 'blocked' && (
            <Button 
              variant="outline" 
              onClick={handleSkip}
              className="w-full"
            >
              Pular por Enquanto
            </Button>
          )}

          <div className="text-center text-xs text-muted-foreground pt-2">
            <p>Processamento seguro via Stripe</p>
            <p className="mt-1">Seus dados de pagamento são protegidos e criptografados</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

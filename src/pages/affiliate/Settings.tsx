import AffiliateLayout from "@/components/layout/AffiliateLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAffiliate } from "@/hooks/useAffiliates";
import { useAffiliateStripe, useRefreshAffiliateStripeStatus, useStartAffiliateStripeOnboarding } from "@/hooks/useAffiliateStripe";

const AffiliateSettings = () => {
  const { data: affiliate } = useAffiliate();
  const { data: stripeData } = useAffiliateStripe(affiliate?.id);
  const startOnboarding = useStartAffiliateStripeOnboarding();
  const refreshStripe = useRefreshAffiliateStripeStatus();

  const isConnected = !!stripeData?.stripe_account_id && stripeData?.charges_enabled && stripeData?.payouts_enabled;
  const onboardingStatus = stripeData?.onboarding_status || "nao_iniciado";

  return (
    <AffiliateLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuracoes</h1>
          <p className="text-muted-foreground mt-2">
            Dados do afiliado e conexao com Stripe
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Conta Stripe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Badge variant="default">Conectado</Badge>
              ) : (
                <Badge variant="secondary">Pendente</Badge>
              )}
              <span className="text-xs text-muted-foreground">
                Status: {onboardingStatus}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Conecte sua conta Stripe para receber pagamentos. A configuracao e feita uma unica vez.
            </p>
            <div className="flex items-center gap-2">
              <Button
                onClick={async () => {
                  const url = await startOnboarding.mutateAsync();
                  window.open(url, "_blank", "noopener,noreferrer");
                }}
                disabled={startOnboarding.isPending}
              >
                {isConnected ? "Reabrir Stripe" : "Conectar Stripe"}
              </Button>
              <Button
                variant="outline"
                onClick={() => refreshStripe.mutateAsync()}
                disabled={refreshStripe.isPending}
              >
                Atualizar status
              </Button>
            </div>
            {stripeData?.stripe_account_id && (
              <div className="text-xs text-muted-foreground">
                Conta: {stripeData.stripe_account_id}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dados do Afiliado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">Nome: {affiliate?.name || "-"}</div>
            <div className="text-sm text-muted-foreground">Email: {affiliate?.email || "-"}</div>
          </CardContent>
        </Card>
      </div>
    </AffiliateLayout>
  );
};

export default AffiliateSettings;

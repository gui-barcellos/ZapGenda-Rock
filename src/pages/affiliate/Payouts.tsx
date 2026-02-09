import AffiliateLayout from "@/components/layout/AffiliateLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAffiliate, useAffiliatePayouts } from "@/hooks/useAffiliates";

const AffiliatePayouts = () => {
  const { data: affiliate } = useAffiliate();
  const { data: payouts = [] } = useAffiliatePayouts(affiliate?.id);

  return (
    <AffiliateLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pagamentos</h1>
          <p className="text-muted-foreground mt-2">
            Historico de pagamentos e status
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pagamentos</CardTitle>
          </CardHeader>
          <CardContent>
            {payouts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum pagamento registrado.</p>
            ) : (
              <div className="space-y-2">
                {payouts.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <div className="font-medium">R$ {Number(p.amount || 0).toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">Status: {p.status}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">{p.created_at?.substring(0, 10)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AffiliateLayout>
  );
};

export default AffiliatePayouts;

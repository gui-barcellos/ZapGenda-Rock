import AffiliateLayout from "@/components/layout/AffiliateLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAffiliate, useAffiliateCompanies } from "@/hooks/useAffiliates";

const AffiliateCompanies = () => {
  const { data: affiliate } = useAffiliate();
  const { data: companies = [] } = useAffiliateCompanies(affiliate?.id);

  return (
    <AffiliateLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Empresas Indicadas</h1>
          <p className="text-muted-foreground mt-2">
            Lista de empresas vinculadas a voce
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Empresas</CardTitle>
          </CardHeader>
          <CardContent>
            {companies.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma empresa vinculada ainda.</p>
            ) : (
              <div className="space-y-2">
                {companies.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <div className="font-medium">{c.company?.name || "Empresa"}</div>
                      <div className="text-xs text-muted-foreground">Status: {c.company?.status}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">{c.status}</div>
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

export default AffiliateCompanies;

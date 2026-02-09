import AffiliateLayout from "@/components/layout/AffiliateLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAffiliate, useAffiliateCompanies, useAffiliateCommissions } from "@/hooks/useAffiliates";
import { endOfMonth, format, isWithinInterval, parseISO, startOfMonth } from "date-fns";

const AffiliateDashboard = () => {
  const { data: affiliate } = useAffiliate();
  const { data: companies = [] } = useAffiliateCompanies(affiliate?.id);
  const { data: commissions = [] } = useAffiliateCommissions(affiliate?.id);

  const activeCompanies = companies.filter((c: any) => c.status === "active").length;
  const now = new Date();
  const monthInterval = { start: startOfMonth(now), end: endOfMonth(now) };
  const commissionList = commissions.filter((c: any) => c.status !== "reversed");

  const getCommissionDate = (c: any) => {
    if (c.period_start) return parseISO(c.period_start);
    if (c.created_at) return new Date(c.created_at);
    return now;
  };

  const monthTotal = commissionList
    .filter((c: any) => isWithinInterval(getCommissionDate(c), monthInterval))
    .reduce((sum: number, c: any) => sum + (c.amount || 0), 0);

  const totalAll = commissionList.reduce((sum: number, c: any) => sum + (c.amount || 0), 0);

  const pendingTotal = commissionList
    .filter((c: any) => c.status === "pending")
    .reduce((sum: number, c: any) => sum + (c.amount || 0), 0);

  const companyTotals = commissionList.reduce((acc: Record<string, any>, c: any) => {
    const companyId = c.company?.id || "unknown";
    if (!acc[companyId]) {
      acc[companyId] = {
        companyId,
        companyName: c.company?.name || "Empresa",
        total: 0,
        pending: 0,
        paid: 0,
        currency: c.currency || "BRL",
      };
    }
    acc[companyId].total += c.amount || 0;
    if (c.status === "pending") acc[companyId].pending += c.amount || 0;
    if (c.status === "paid") acc[companyId].paid += c.amount || 0;
    return acc;
  }, {});

  const companyRows = Object.values(companyTotals).sort((a: any, b: any) => b.total - a.total);

  const monthlyTotals = commissionList.reduce((acc: Record<string, number>, c: any) => {
    const date = getCommissionDate(c);
    const key = format(date, "yyyy-MM");
    acc[key] = (acc[key] || 0) + (c.amount || 0);
    return acc;
  }, {});

  const monthlyRows = Object.entries(monthlyTotals)
    .map(([key, total]) => ({
      key,
      label: format(parseISO(`${key}-01`), "MMMM yyyy"),
      total,
    }))
    .sort((a, b) => (a.key < b.key ? 1 : -1));

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <AffiliateLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Painel do Afiliado</h1>
          <p className="text-muted-foreground mt-2">
            Visao geral dos seus clientes e comissoes
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Empresas Ativas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeCompanies}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Comissao do Mes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(monthTotal)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total Acumulado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalAll)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Pendente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(pendingTotal)}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Comissao por Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            {companyRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem comissoes registradas.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Pendente</TableHead>
                    <TableHead>Pago</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companyRows.map((row: any) => (
                    <TableRow key={row.companyId}>
                      <TableCell>
                        <div className="font-medium">{row.companyName}</div>
                      </TableCell>
                      <TableCell>{formatCurrency(row.total)}</TableCell>
                      <TableCell>
                        {row.pending > 0 ? (
                          <Badge variant="secondary">{formatCurrency(row.pending)}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.paid > 0 ? (
                          <Badge variant="outline">{formatCurrency(row.paid)}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Historico Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem historico mensal ainda.</p>
            ) : (
              <div className="space-y-2">
                {monthlyRows.map((row) => (
                  <div key={row.key} className="flex items-center justify-between border-b pb-2">
                    <div className="text-sm">{row.label}</div>
                    <div className="font-medium">{formatCurrency(row.total)}</div>
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

export default AffiliateDashboard;

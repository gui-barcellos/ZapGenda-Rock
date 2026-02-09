import SuperUserLayout from "@/components/layout/SuperUserLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useApproveAffiliatePayout,
  usePayAffiliatePayout,
  useSuperuserAffiliateCompanies,
  useSuperuserAffiliateCommissions,
  useSuperuserAffiliatePayouts,
  useSuperuserAffiliates,
} from "@/hooks/useSuperuserAffiliates";
import { endOfMonth, format, isWithinInterval, parseISO, startOfMonth } from "date-fns";
import { useMemo, useState } from "react";

const Affiliates = () => {
  const { data: affiliates = [] } = useSuperuserAffiliates();
  const { data: affiliateCompanies = [] } = useSuperuserAffiliateCompanies();
  const { data: commissions = [] } = useSuperuserAffiliateCommissions();
  const { data: payouts = [] } = useSuperuserAffiliatePayouts();
  const approvePayout = useApproveAffiliatePayout();
  const payPayout = usePayAffiliatePayout();

  const now = new Date();
  const monthInterval = { start: startOfMonth(now), end: endOfMonth(now) };

  const getCommissionDate = (c: any) => {
    if (c.period_start) return parseISO(c.period_start);
    if (c.created_at) return new Date(c.created_at);
    return now;
  };

  const commissionList = commissions.filter((c: any) => c.status !== "reversed");
  const monthTotal = commissionList
    .filter((c: any) => isWithinInterval(getCommissionDate(c), monthInterval))
    .reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
  const totalAll = commissionList.reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
  const pendingTotal = commissionList
    .filter((c: any) => c.status === "pending")
    .reduce((sum: number, c: any) => sum + (c.amount || 0), 0);

  const affiliateStats = affiliates.reduce((acc: Record<string, any>, affiliate: any) => {
    const affiliateId = affiliate.id;
    const companies = affiliateCompanies.filter((row: any) => row.affiliate?.id === affiliateId);
    const activeCompanies = companies.filter((row: any) => row.company?.status === "active").length;

    acc[affiliateId] = {
      affiliateId,
      name: affiliate.name,
      email: affiliate.email,
      status: affiliate.status,
      companies: companies.length,
      activeCompanies,
      total: 0,
      pending: 0,
      paid: 0,
      lastCommission: null as Date | null,
    };

    return acc;
  }, {});

  commissionList.forEach((c: any) => {
    const affiliateId = c.affiliate?.id || "unknown";
    if (!affiliateStats[affiliateId]) {
      affiliateStats[affiliateId] = {
        affiliateId,
        name: c.affiliate?.name || "Afiliado",
        email: "-",
        status: "-",
        companies: 0,
        activeCompanies: 0,
        total: 0,
        pending: 0,
        paid: 0,
        lastCommission: null,
      };
    }

    affiliateStats[affiliateId].total += c.amount || 0;
    if (c.status === "pending") affiliateStats[affiliateId].pending += c.amount || 0;
    if (c.status === "paid") affiliateStats[affiliateId].paid += c.amount || 0;

    const date = getCommissionDate(c);
    if (!affiliateStats[affiliateId].lastCommission || date > affiliateStats[affiliateId].lastCommission) {
      affiliateStats[affiliateId].lastCommission = date;
    }
  });

  const affiliateRows = Object.values(affiliateStats).sort((a: any, b: any) => b.total - a.total);

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const detailedRows = useMemo(() => {
    return commissionList.filter((c: any) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (search) {
        const haystack = `${c.affiliate?.name || ""} ${c.company?.name || ""} ${c.invoice_id || ""}`.toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [commissionList, statusFilter, search]);

  const handleExportCsv = () => {
    const headers = [
      "affiliate",
      "company",
      "invoice_id",
      "amount",
      "currency",
      "status",
      "period_start",
      "period_end",
      "created_at",
    ];

    const rows = detailedRows.map((c: any) => [
      c.affiliate?.name || "",
      c.company?.name || "",
      c.invoice_id || "",
      c.amount || 0,
      c.currency || "BRL",
      c.status || "",
      c.period_start || "",
      c.period_end || "",
      c.created_at || "",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `affiliate-commissions-${format(new Date(), "yyyyMMdd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const pendingPayouts = payouts.filter((p: any) => p.status === "pending" || p.status === "approved");

  return (
    <SuperUserLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Afiliados</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie afiliados, comissoes e empresas vinculadas
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Afiliados Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{affiliates.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Empresas Vinculadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{affiliateCompanies.length}</div>
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
              <CardTitle className="text-sm font-medium">Pendente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(pendingTotal)}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Payouts pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingPayouts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum payout pendente.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Afiliado</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingPayouts.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="font-medium">{p.affiliate?.name || "-"}</div>
                        <div className="text-xs text-muted-foreground">{p.affiliate?.email || ""}</div>
                      </TableCell>
                      <TableCell>{formatCurrency(p.amount || 0)}</TableCell>
                      <TableCell>
                        <Badge variant={p.status === "approved" ? "default" : "secondary"}>
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {p.created_at ? format(new Date(p.created_at), "dd/MM/yyyy") : "-"}
                      </TableCell>
                      <TableCell className="space-x-2">
                        {p.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => approvePayout.mutate(p.id)}
                            disabled={approvePayout.isPending}
                          >
                            Aprovar
                          </Button>
                        )}
                        {p.status === "approved" && (
                          <Button
                            size="sm"
                            onClick={() => payPayout.mutate(p.id)}
                            disabled={payPayout.isPending}
                          >
                            Pagar
                          </Button>
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
            <CardTitle>Comissoes por Afiliado</CardTitle>
          </CardHeader>
          <CardContent>
            {affiliateRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma comissao registrada.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Afiliado</TableHead>
                    <TableHead>Empresas</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Pendente</TableHead>
                    <TableHead>Pago</TableHead>
                    <TableHead>Ultima comissao</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {affiliateRows.map((row: any) => (
                    <TableRow key={row.affiliateId}>
                      <TableCell>
                        <div className="font-medium">{row.name}</div>
                        <div className="text-xs text-muted-foreground">{row.email}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{row.activeCompanies} ativas</div>
                        <div className="text-xs text-muted-foreground">{row.companies} total</div>
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
                      <TableCell>
                        {row.lastCommission
                          ? format(row.lastCommission, "dd/MM/yyyy")
                          : "-"}
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
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <CardTitle>Comissoes detalhadas</CardTitle>
              <Button variant="outline" onClick={handleExportCsv}>
                Exportar CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Buscar por afiliado, empresa ou invoice"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {detailedRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum registro encontrado.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Afiliado</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Periodo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailedRows.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.affiliate?.name || "-"}</TableCell>
                      <TableCell>{c.company?.name || "-"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.invoice_id || "-"}</TableCell>
                      <TableCell className="text-xs">
                        {c.period_start || "-"} &rarr; {c.period_end || "-"}
                      </TableCell>
                      <TableCell>{formatCurrency(c.amount || 0)}</TableCell>
                      <TableCell>
                        <Badge variant={c.status === "paid" ? "default" : "secondary"}>
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {c.created_at ? format(new Date(c.created_at), "dd/MM/yyyy") : "-"}
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
            <CardTitle>Resumo Geral</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-sm text-muted-foreground">Total acumulado</span>
              <span className="font-medium">{formatCurrency(totalAll)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </SuperUserLayout>
  );
};

export default Affiliates;

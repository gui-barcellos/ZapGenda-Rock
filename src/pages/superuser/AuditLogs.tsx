import SuperUserLayout from "@/components/layout/SuperUserLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { useCompanies } from "@/hooks/useCompanies";
import { format } from "date-fns";
import { useMemo, useState } from "react";

const SuperuserAuditLogs = () => {
  const [companyFilter, setCompanyFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: companies = [] } = useCompanies({ status: "all" });
  const { data: logs = [], isLoading } = useAuditLogs({
    companyId: companyFilter === "all" ? undefined : companyFilter,
    limit: 300,
  });

  const companyMap = useMemo(() => {
    return companies.reduce((acc: Record<string, string>, company: any) => {
      acc[company.id] = company.name;
      return acc;
    }, {});
  }, [companies]);

  const filtered = useMemo(() => {
    return logs.filter((log: any) => {
      if (actionFilter !== "all" && log.action !== actionFilter) return false;
      if (entityFilter !== "all" && log.entity_type !== entityFilter) return false;
      if (search) {
        const haystack = `${log.action} ${log.entity_type} ${log.reason || ""}`.toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [logs, actionFilter, entityFilter, search]);

  const actionOptions = Array.from(new Set(logs.map((log: any) => log.action))).filter(Boolean);
  const entityOptions = Array.from(new Set(logs.map((log: any) => log.entity_type))).filter(Boolean);

  return (
    <SuperUserLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Auditoria</h1>
          <p className="text-muted-foreground mt-2">
            Registro de alteracoes criticas por empresa
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 md:flex-row md:items-center">
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Filtrar por empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as empresas</SelectItem>
                {companies.map((company: any) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Filtrar por acao" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as acoes</SelectItem>
                {actionOptions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Filtrar por entidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as entidades</SelectItem>
                {entityOptions.map((entity) => (
                  <SelectItem key={entity} value={entity}>
                    {entity}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex-1">
              <Input
                placeholder="Buscar por acao, entidade ou motivo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Logs</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum log encontrado.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Acao</TableHead>
                    <TableHead>Entidade</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Ator</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">
                        {log.created_at ? format(new Date(log.created_at), "dd/MM/yyyy HH:mm") : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{companyMap[log.company_id] || "-"}</div>
                        <div className="text-xs text-muted-foreground">{log.company_id}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{log.action}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{log.entity_type}</div>
                        <div className="text-xs text-muted-foreground">{log.entity_id || "-"}</div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.reason || "-"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {log.actor_type || "user"}
                        {log.actor_user_id ? ` (${log.actor_user_id})` : ""}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </SuperUserLayout>
  );
};

export default SuperuserAuditLogs;

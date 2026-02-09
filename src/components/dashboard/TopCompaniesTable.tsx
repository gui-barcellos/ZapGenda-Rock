import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { EditLimitsDialog } from "@/components/subscriptions/EditLimitsDialog";

interface TopCompany {
  companyId: string;
  companyName: string;
  tokensUsed: number;
  maxTokens: number;
  percentage: number;
}

interface TopCompaniesTableProps {
  companies: TopCompany[];
  isLoading?: boolean;
}

export const TopCompaniesTable = ({ companies, isLoading }: TopCompaniesTableProps) => {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  const getStatusVariant = (percentage: number) => {
    if (percentage >= 100) return "destructive";
    if (percentage >= 80) return "warning";
    if (percentage >= 60) return "default";
    return "secondary";
  };

  const getStatusLabel = (percentage: number) => {
    if (percentage >= 100) return "Excedido";
    if (percentage >= 80) return "Crítico";
    if (percentage >= 60) return "Atenção";
    return "Normal";
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(2)}M`;
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toLocaleString();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ranking de Empresas</CardTitle>
          <CardDescription>Maiores consumidores de tokens</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Ranking de Empresas por Consumo</CardTitle>
          <CardDescription>Top 20 maiores consumidores de tokens de IA</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead className="text-right">Tokens Usados</TableHead>
                <TableHead className="text-right">Limite</TableHead>
                <TableHead className="w-[200px]">Uso do Limite</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company, index) => (
                <TableRow key={company.companyId}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell className="font-medium">{company.companyName}</TableCell>
                  <TableCell className="text-right">{formatTokens(company.tokensUsed)}</TableCell>
                  <TableCell className="text-right">{formatTokens(company.maxTokens)}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Progress value={Math.min(company.percentage, 100)} />
                      <p className="text-xs text-muted-foreground text-right">
                        {company.percentage.toFixed(1)}%
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(company.percentage) as any}>
                      {getStatusLabel(company.percentage)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedCompanyId(company.companyId)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedCompanyId && (
        <EditLimitsDialog
          companyId={selectedCompanyId}
          open={!!selectedCompanyId}
          onOpenChange={(open) => !open && setSelectedCompanyId(null)}
        />
      )}
    </>
  );
};

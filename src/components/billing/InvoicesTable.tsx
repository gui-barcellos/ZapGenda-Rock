import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, MoreVertical, Eye, CheckCircle, XCircle, Download } from "lucide-react";
import { useInvoices } from "@/hooks/useInvoices";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { InvoiceDetailsDialog } from "./InvoiceDetailsDialog";
import { UpdateInvoiceStatusDialog } from "./UpdateInvoiceStatusDialog";

export const InvoicesTable = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  const { data: invoices, isLoading } = useInvoices({
    search,
    status: statusFilter,
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      paid: { variant: "default", label: "Paga" },
      pending: { variant: "secondary", label: "Pendente" },
      overdue: { variant: "destructive", label: "Vencida" },
      failed: { variant: "destructive", label: "Falhou" },
    };

    const config = variants[status] || { variant: "secondary", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleViewDetails = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    setDetailsDialogOpen(true);
  };

  const handleUpdateStatus = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    setStatusDialogOpen(true);
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="paid">Pagas</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="overdue">Vencidas</SelectItem>
            <SelectItem value="failed">Falhas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Valor Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Data Criação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices && invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhuma fatura encontrada
                </TableCell>
              </TableRow>
            ) : (
              invoices?.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    {invoice.companies?.name || 'Empresa não encontrada'}
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold">
                      R$ {Number(invoice.amount_total).toFixed(2)}
                    </div>
                    {invoice.amount_paid > 0 && invoice.amount_paid !== invoice.amount_total && (
                      <div className="text-xs text-muted-foreground">
                        Pago: R$ {Number(invoice.amount_paid).toFixed(2)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(invoice.status)}
                  </TableCell>
                  <TableCell>
                    {invoice.due_date ? (
                      <span className={
                        invoice.status === 'overdue' 
                          ? 'text-destructive font-medium' 
                          : ''
                      }>
                        {format(new Date(invoice.due_date), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Sem vencimento</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(invoice.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewDetails(invoice.id)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Detalhes
                        </DropdownMenuItem>
                        {invoice.status !== 'paid' && (
                          <DropdownMenuItem onClick={() => handleUpdateStatus(invoice.id)}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Atualizar Status
                          </DropdownMenuItem>
                        )}
                        {invoice.invoice_pdf_url && (
                          <DropdownMenuItem asChild>
                            <a href={invoice.invoice_pdf_url} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4 mr-2" />
                              Baixar PDF
                            </a>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedInvoiceId && (
        <>
          <InvoiceDetailsDialog
            invoiceId={selectedInvoiceId}
            open={detailsDialogOpen}
            onOpenChange={setDetailsDialogOpen}
          />
          <UpdateInvoiceStatusDialog
            invoiceId={selectedInvoiceId}
            open={statusDialogOpen}
            onOpenChange={setStatusDialogOpen}
          />
        </>
      )}
    </div>
  );
};

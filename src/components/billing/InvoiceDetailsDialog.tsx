import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useInvoiceDetails } from "@/hooks/useInvoices";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Building2, Calendar, DollarSign, FileText, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

interface InvoiceDetailsDialogProps {
  invoiceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const InvoiceDetailsDialog = ({ invoiceId, open, onOpenChange }: InvoiceDetailsDialogProps) => {
  const { data: invoice, isLoading } = useInvoiceDetails(invoiceId);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Detalhes da Fatura</DialogTitle>
          <DialogDescription>
            Informações completas sobre a fatura
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : invoice ? (
          <div className="space-y-6">
            {/* Company Info */}
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 p-3 rounded-lg">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{invoice.companies?.name}</h3>
                <div className="text-sm text-muted-foreground space-y-1 mt-1">
                  <p>Responsável: {invoice.companies?.owner_name}</p>
                  <p>Email: {invoice.companies?.owner_email}</p>
                  {invoice.companies?.owner_whatsapp && (
                    <p>WhatsApp: {invoice.companies.owner_whatsapp}</p>
                  )}
                </div>
              </div>
              {getStatusBadge(invoice.status)}
            </div>

            <Separator />

            {/* Invoice Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>Valor Total</span>
                </div>
                <p className="text-2xl font-bold">
                  R$ {Number(invoice.amount_total).toFixed(2)}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>Valor Pago</span>
                </div>
                <p className="text-2xl font-bold">
                  R$ {Number(invoice.amount_paid).toFixed(2)}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Data de Criação</span>
                </div>
                <p className="font-medium">
                  {format(new Date(invoice.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Vencimento</span>
                </div>
                <p className="font-medium">
                  {invoice.due_date 
                    ? format(new Date(invoice.due_date), "dd/MM/yyyy", { locale: ptBR })
                    : "Sem vencimento"
                  }
                </p>
              </div>

              {invoice.paid_at && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Data de Pagamento</span>
                  </div>
                  <p className="font-medium">
                    {format(new Date(invoice.paid_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>Tentativas de Cobrança</span>
                </div>
                <p className="font-medium">{invoice.attempt_count}</p>
              </div>
            </div>

            {invoice.billing_reason && (
              <>
                <Separator />
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>Motivo da Cobrança</span>
                  </div>
                  <p className="font-medium capitalize">{invoice.billing_reason}</p>
                </div>
              </>
            )}

            {(invoice.stripe_invoice_id || invoice.stripe_charge_id) && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CreditCard className="h-4 w-4" />
                    <span>Informações Stripe</span>
                  </div>
                  {invoice.stripe_invoice_id && (
                    <p className="text-xs font-mono bg-muted p-2 rounded">
                      Invoice ID: {invoice.stripe_invoice_id}
                    </p>
                  )}
                  {invoice.stripe_charge_id && (
                    <p className="text-xs font-mono bg-muted p-2 rounded">
                      Charge ID: {invoice.stripe_charge_id}
                    </p>
                  )}
                </div>
              </>
            )}

            {invoice.invoice_pdf_url && (
              <>
                <Separator />
                <Button asChild className="w-full">
                  <a href={invoice.invoice_pdf_url} target="_blank" rel="noopener noreferrer">
                    Baixar PDF da Fatura
                  </a>
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Fatura não encontrada
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

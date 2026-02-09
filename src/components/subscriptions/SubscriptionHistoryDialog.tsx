import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSubscriptionHistory } from "@/hooks/useSubscriptions";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, ArrowUpCircle, ArrowDownCircle, Settings, CheckCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SubscriptionHistoryDialogProps {
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CHANGE_ICONS: Record<string, any> = {
  'limit_change': Settings,
  'plan_change': ArrowUpCircle,
  'upgrade': ArrowUpCircle,
  'downgrade': ArrowDownCircle,
  'activated': CheckCircle,
};

const CHANGE_LABELS: Record<string, string> = {
  'limit_change': 'Alteração de Limites',
  'plan_change': 'Mudança de Plano',
  'upgrade': 'Upgrade de Plano',
  'downgrade': 'Downgrade de Plano',
  'activated': 'Plano Ativado',
};

export const SubscriptionHistoryDialog = ({ companyId, open, onOpenChange }: SubscriptionHistoryDialogProps) => {
  const { data: history, isLoading } = useSubscriptionHistory(companyId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Histórico de Assinatura</DialogTitle>
          <DialogDescription>
            Visualize todas as alterações realizadas nesta assinatura
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : history && history.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            Nenhuma alteração registrada ainda
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {history?.map((change) => {
                const Icon = CHANGE_ICONS[change.change_type] || Settings;
                
                return (
                  <div key={change.id} className="flex gap-4 pb-4 border-b last:border-0">
                    <div className="flex-shrink-0 mt-1">
                      <div className="bg-primary/10 p-2 rounded-lg">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">
                            {CHANGE_LABELS[change.change_type] || change.change_type}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(change.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      
                      {change.resource_type && change.resource_type !== 'multiple' && (
                        <p className="text-sm">
                          <span className="font-medium">Recurso:</span> {change.resource_type}
                          {change.quantity_change !== 0 && (
                            <span className="ml-2">
                              ({change.quantity_change > 0 ? '+' : ''}{change.quantity_change})
                            </span>
                          )}
                        </p>
                      )}
                      
                      {change.profiles && (
                        <p className="text-xs text-muted-foreground">
                          Por: {change.profiles?.full_name || 'Desconhecido'} ({change.profiles?.email || 'N/A'})
                        </p>
                      )}
                      
                      {change.scheduled_for && (
                        <p className="text-xs text-muted-foreground">
                          Agendado para: {format(new Date(change.scheduled_for), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      )}
                      
                      {change.applied_at && (
                        <p className="text-xs text-accent">
                          ✓ Aplicado em: {format(new Date(change.applied_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};

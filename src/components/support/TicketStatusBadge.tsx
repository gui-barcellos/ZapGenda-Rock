import { Badge } from "@/components/ui/badge";
import type { TicketStatus } from "@/hooks/useSupportTickets";

interface TicketStatusBadgeProps {
  status: TicketStatus;
}

const statusConfig = {
  open: { label: "Aberto", variant: "default" as const },
  in_progress: { label: "Em Progresso", variant: "secondary" as const },
  waiting_customer: { label: "Aguardando Cliente", variant: "outline" as const },
  resolved: { label: "Resolvido", variant: "default" as const },
  closed: { label: "Fechado", variant: "secondary" as const },
};

export const TicketStatusBadge = ({ status }: TicketStatusBadgeProps) => {
  const config = statusConfig[status] || statusConfig.open;

  return <Badge variant={config.variant}>{config.label}</Badge>;
};
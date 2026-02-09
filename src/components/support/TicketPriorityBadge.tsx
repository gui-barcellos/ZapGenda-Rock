import { Badge } from "@/components/ui/badge";
import type { TicketPriority } from "@/hooks/useSupportTickets";

interface TicketPriorityBadgeProps {
  priority: TicketPriority;
}

const priorityConfig = {
  low: { label: "Baixa", variant: "outline" as const },
  medium: { label: "Média", variant: "secondary" as const },
  high: { label: "Alta", variant: "default" as const },
  urgent: { label: "Urgente", variant: "destructive" as const },
};

export const TicketPriorityBadge = ({ priority }: TicketPriorityBadgeProps) => {
  const config = priorityConfig[priority] || priorityConfig.medium;

  return <Badge variant={config.variant}>{config.label}</Badge>;
};
import { Badge } from "@/components/ui/badge";
import { Bot, User, Archive } from "lucide-react";

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const config = {
    ai: {
      icon: Bot,
      label: "IA",
      variant: "secondary" as const,
    },
    human: {
      icon: User,
      label: "Humano",
      variant: "default" as const,
    },
    archived: {
      icon: Archive,
      label: "Arquivado",
      variant: "outline" as const,
    },
  };

  const { icon: Icon, label, variant } = config[status as keyof typeof config] || config.ai;

  return (
    <Badge variant={variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
};

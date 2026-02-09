import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useTagRegistry } from "@/hooks/useTagManagement";

interface TagBadgeProps {
  tag: string;
  variant?: "default" | "outline" | "removable";
  showCount?: boolean;
  count?: number;
  onRemove?: () => void;
}

export function TagBadge({
  tag,
  variant = "default",
  showCount = false,
  count,
  onRemove,
}: TagBadgeProps) {
  const { data: registry } = useTagRegistry();
  
  const tagInfo = registry?.find((t) => t.name === tag);
  const color = tagInfo?.color || "#3b82f6";

  const style =
    variant === "outline"
      ? {
          borderColor: color,
          color: color,
        }
      : {
          backgroundColor: color,
          color: "#ffffff",
        };

  return (
    <Badge
      variant={variant === "removable" ? "secondary" : variant}
      className="text-sm"
      style={variant !== "removable" ? style : undefined}
    >
      {tag}
      {showCount && count !== undefined && (
        <span className="ml-1 opacity-70">({count})</span>
      )}
      {variant === "removable" && onRemove && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 hover:bg-muted rounded-full p-0.5"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </Badge>
  );
}

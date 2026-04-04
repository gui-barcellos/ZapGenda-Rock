import { Link } from "react-router-dom";
import { LucideIcon, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface GuidedEmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "default" | "outline" | "secondary";
}

interface GuidedEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: string;
  steps?: string[];
  actions?: GuidedEmptyStateAction[];
  compact?: boolean;
}

export function GuidedEmptyState({
  icon: Icon,
  title,
  description,
  badge,
  steps = [],
  actions = [],
  compact = false,
}: GuidedEmptyStateProps) {
  return (
    <Card className="border-dashed shadow-sm">
      <CardHeader className={compact ? "p-5" : undefined}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription className="mt-1">{description}</CardDescription>
            </div>
          </div>
          {badge ? <Badge variant="secondary">{badge}</Badge> : null}
        </div>
      </CardHeader>

      {(steps.length > 0 || actions.length > 0) && (
        <CardContent className={compact ? "px-5 pb-5 pt-0" : undefined}>
          <div className="space-y-4">
            {steps.length > 0 && (
              <div className="grid gap-2">
                {steps.map((step) => (
                  <div key={step} className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                    {step}
                  </div>
                ))}
              </div>
            )}

            {actions.length > 0 && (
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {actions.map((action) => {
                  if (action.href) {
                    return (
                      <Button key={`${action.label}-${action.href}`} asChild variant={action.variant ?? "default"}>
                        <Link to={action.href}>
                          {action.label}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    );
                  }

                  return (
                    <Button
                      key={action.label}
                      type="button"
                      variant={action.variant ?? "default"}
                      onClick={action.onClick}
                    >
                      {action.label}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

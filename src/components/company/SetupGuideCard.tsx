import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";

interface GuideAction {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "default" | "outline" | "secondary";
}

interface GuideStep {
  title: string;
  description: string;
  done?: boolean;
}

interface SetupGuideCardProps {
  title: string;
  description: string;
  badge?: string;
  steps?: GuideStep[];
  actions?: GuideAction[];
}

export function SetupGuideCard({ title, description, badge, steps = [], actions = [] }: SetupGuideCardProps) {
  return (
    <Card className="border-dashed shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              {title}
            </CardTitle>
            <CardDescription className="mt-1 text-sm">{description}</CardDescription>
          </div>
          {badge ? <Badge variant="secondary">{badge}</Badge> : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {steps.length > 0 && (
          <div className="grid gap-3">
            {steps.map((step) => (
              <div key={step.title} className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3">
                <CheckCircle2 className={`mt-0.5 h-4 w-4 ${step.done ? "text-green-600" : "text-muted-foreground"}`} />
                <div>
                  <div className="font-medium">{step.title}</div>
                  <div className="text-sm text-muted-foreground">{step.description}</div>
                </div>
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
      </CardContent>
    </Card>
  );
}

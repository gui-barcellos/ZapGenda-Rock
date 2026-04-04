import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, CircleDashed, MessageSquare, CalendarClock, UserRound, Stethoscope, ArrowRight } from "lucide-react";

interface OnboardingChecklistCardProps {
  professionalsCount: number;
  activeServicesCount: number;
  hasBusinessHours: boolean;
  hasWhatsAppConnected: boolean;
  compact?: boolean;
}

interface ChecklistStep {
  id: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  done: boolean;
  icon: typeof Stethoscope;
}

export function OnboardingChecklistCard({
  professionalsCount,
  activeServicesCount,
  hasBusinessHours,
  hasWhatsAppConnected,
  compact = false,
}: OnboardingChecklistCardProps) {
  const steps: ChecklistStep[] = [
    {
      id: "professionals",
      title: "Cadastre profissionais",
      description: professionalsCount > 0
        ? `${professionalsCount} profissional${professionalsCount === 1 ? " ativo" : "is ativos"} pronto${professionalsCount === 1 ? "" : "s"}`
        : "Adicione pelo menos um profissional para liberar a agenda.",
      href: "/company/settings/professionals",
      cta: professionalsCount > 0 ? "Gerenciar profissionais" : "Adicionar profissional",
      done: professionalsCount > 0,
      icon: UserRound,
    },
    {
      id: "services",
      title: "Cadastre serviços",
      description: activeServicesCount > 0
        ? `${activeServicesCount} serviço${activeServicesCount === 1 ? " ativo" : "s ativos"} configurado${activeServicesCount === 1 ? "" : "s"}`
        : "Crie ao menos um serviço ativo e vincule profissionais.",
      href: "/company/settings/services",
      cta: activeServicesCount > 0 ? "Gerenciar serviços" : "Adicionar serviço",
      done: activeServicesCount > 0,
      icon: Stethoscope,
    },
    {
      id: "hours",
      title: "Configure horários",
      description: hasBusinessHours
        ? "Horários da clínica configurados."
        : "Defina os horários de atendimento para abrir sua agenda.",
      href: "/company/settings/availability",
      cta: hasBusinessHours ? "Revisar horários" : "Configurar horários",
      done: hasBusinessHours,
      icon: CalendarClock,
    },
    {
      id: "whatsapp",
      title: "Conecte o WhatsApp",
      description: hasWhatsAppConnected
        ? "Canal conectado e pronto para atendimento."
        : "Conecte o número da clínica para habilitar automações e chat ao vivo.",
      href: "/company/settings/whatsapp",
      cta: hasWhatsAppConnected ? "Ver conexão" : "Conectar WhatsApp",
      done: hasWhatsAppConnected,
      icon: MessageSquare,
    },
  ];

  const completedSteps = steps.filter((step) => step.done).length;
  const progress = (completedSteps / steps.length) * 100;
  const fullyReady = completedSteps === steps.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {fullyReady ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <CircleDashed className="h-5 w-5 text-muted-foreground" />}
              Onboarding mínimo do MVP
            </CardTitle>
            <CardDescription>
              {fullyReady
                ? "Base operacional pronta para começar a usar a agenda e o WhatsApp."
                : "Feche estes itens para conseguir operar a clínica com menos atrito."}
            </CardDescription>
          </div>
          <Badge variant={fullyReady ? "default" : "secondary"}>
            {completedSteps}/{steps.length} concluídos
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Progresso</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} />
        </div>

        <div className="grid gap-3">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {step.done ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{step.title}</div>
                    <div className="text-sm text-muted-foreground">{step.description}</div>
                  </div>
                </div>

                <Button asChild variant={step.done ? "outline" : "default"} size={compact ? "sm" : "default"}>
                  <Link to={step.href}>
                    {step.cta}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActionDefinitions, ActionDefinition } from "@/hooks/useActionDefinitions";
import { 
  Save, Info, Calendar, Settings, Zap, ChevronDown, ChevronUp,
  CalendarSearch, CalendarPlus, CalendarX, RefreshCw, List, UserRoundCog,
  Building2, Users, Briefcase, Clock, AlertTriangle, Search, Tag, MessageSquare
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// Color palette for categories (non-consecutive)
const CATEGORY_COLORS = [
  "bg-blue-500/10 text-blue-600 border-blue-500/30",
  "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  "bg-purple-500/10 text-purple-600 border-purple-500/30",
  "bg-amber-500/10 text-amber-600 border-amber-500/30",
  "bg-rose-500/10 text-rose-600 border-rose-500/30",
  "bg-cyan-500/10 text-cyan-600 border-cyan-500/30",
  "bg-orange-500/10 text-orange-600 border-orange-500/30",
  "bg-indigo-500/10 text-indigo-600 border-indigo-500/30",
];

const CATEGORY_INFO: Record<string, { label: string; icon: React.ReactNode }> = {
  information: { label: "INFORMAÇÃO", icon: <Info className="h-4 w-4" /> },
  scheduling: { label: "AGENDAMENTO", icon: <Calendar className="h-4 w-4" /> },
  management: { label: "GERENCIAMENTO", icon: <Settings className="h-4 w-4" /> },
  system: { label: "SISTEMA", icon: <Zap className="h-4 w-4" /> },
  busca: { label: "BUSCA", icon: <Search className="h-4 w-4" /> },
  consulting: { label: "CONSULTA", icon: <List className="h-4 w-4" /> },
  contato: { label: "CONTATO", icon: <Users className="h-4 w-4" /> },
  escalacao: { label: "ESCALAÇÃO", icon: <AlertTriangle className="h-4 w-4" /> },
  tags: { label: "TAGS", icon: <Tag className="h-4 w-4" /> },
  agendamento: { label: "AGENDAMENTO", icon: <Calendar className="h-4 w-4" /> },
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  get_company_info: <Building2 className="h-4 w-4" />,
  get_professionals: <Users className="h-4 w-4" />,
  get_services: <Briefcase className="h-4 w-4" />,
  get_professional_services: <Users className="h-4 w-4" />,
  get_service_professionals: <Briefcase className="h-4 w-4" />,
  get_business_hours: <Clock className="h-4 w-4" />,
  check_availability: <CalendarSearch className="h-4 w-4" />,
  create_appointment: <CalendarPlus className="h-4 w-4" />,
  cancel_appointment: <CalendarX className="h-4 w-4" />,
  reschedule_appointment: <RefreshCw className="h-4 w-4" />,
  list_appointments: <List className="h-4 w-4" />,
  escalate_to_human: <UserRoundCog className="h-4 w-4" />,
  mark_urgent: <AlertTriangle className="h-4 w-4" />,
  search_contact: <Search className="h-4 w-4" />,
  search_faq: <Search className="h-4 w-4" />,
  add_tag: <Tag className="h-4 w-4" />,
  remove_tag: <Tag className="h-4 w-4" />,
};

// Funções que usam regras definidas por cada empresa
const PER_COMPANY_FUNCTIONS = ['escalate_human', 'mark_urgent'];

function ActionCard({ action, colorClass }: { action: ActionDefinition; colorClass: string }) {
  const { updateAction } = useActionDefinitions();
  const [description, setDescription] = useState(action.description || "");
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isPerCompany = PER_COMPANY_FUNCTIONS.includes(action.handler);
  const hasChanges = description !== (action.description || "");

  const handleSave = async () => {
    setIsSaving(true);
    await updateAction.mutateAsync({ id: action.id, description });
    setIsSaving(false);
  };

  const handleToggleActive = async (checked: boolean) => {
    await updateAction.mutateAsync({ id: action.id, is_active: checked });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-border/50">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-md ${colorClass}`}>
                  {ACTION_ICONS[action.handler] || <Zap className="h-4 w-4" />}
                </div>
                <div>
                  <CardTitle className="text-sm">{action.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="font-mono text-xs">
                      {action.handler}
                    </Badge>
                    {isPerCompany && (
                      <Badge className="text-xs bg-blue-500/10 text-blue-600 hover:bg-blue-500/20">
                        Por Empresa
                      </Badge>
                    )}
                    {!action.is_active && (
                      <Badge variant="secondary" className="text-xs">
                        Inativo
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            <div className="flex items-center gap-2">
              <Switch
                id={`active-${action.id}`}
                checked={action.is_active ?? true}
                onCheckedChange={handleToggleActive}
              />
              <Label htmlFor={`active-${action.id}`} className="text-sm">
                Função ativa
              </Label>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Descrição (quando a IA deve usar)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className={`text-sm ${isPerCompany ? "bg-muted/50 cursor-not-allowed" : ""}`}
                placeholder="Descreva quando a IA deve chamar esta função..."
                disabled={isPerCompany}
              />
              {isPerCompany ? (
                <p className="text-xs text-blue-600 bg-blue-500/10 p-2 rounded-md">
                  Esta função usa as regras definidas por cada empresa em suas configurações de IA. 
                  A descrição acima é apenas o fallback caso a empresa não configure regras personalizadas.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Esta descrição é enviada à IA para ajudá-la a decidir quando usar esta função.
                </p>
              )}
            </div>

            {!isPerCompany && (
              <div className="flex justify-end">
                <Button
                  onClick={handleSave}
                  disabled={!hasChanges || isSaving}
                  size="sm"
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function AvailabilityRulesSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Regras de Disponibilidade</CardTitle>
        <CardDescription>
          O backend controla quais funções estão disponíveis em cada estágio da conversa.
          Estas regras são fixas e não podem ser editadas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
            <Badge variant="secondary">idle</Badge>
            <span className="text-muted-foreground">→</span>
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline" className="text-xs">get_*</Badge>
              <Badge variant="outline" className="text-xs">check_availability</Badge>
              <Badge variant="outline" className="text-xs">list_appointments</Badge>
              <Badge variant="outline" className="text-xs">escalate_to_human</Badge>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
            <Badge className="bg-green-500/20 text-green-700">scheduling</Badge>
            <span className="text-muted-foreground">→</span>
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline" className="text-xs">get_*</Badge>
              <Badge variant="outline" className="text-xs">check_availability</Badge>
              <Badge variant="outline" className="text-xs">create_appointment</Badge>
              <Badge variant="outline" className="text-xs">escalate_to_human</Badge>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
            <Badge className="bg-blue-500/20 text-blue-700">consulting</Badge>
            <span className="text-muted-foreground">→</span>
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline" className="text-xs">get_*</Badge>
              <Badge variant="outline" className="text-xs">cancel_appointment</Badge>
              <Badge variant="outline" className="text-xs">reschedule_appointment</Badge>
              <Badge variant="outline" className="text-xs">escalate_to_human</Badge>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
            <Badge className="bg-orange-500/20 text-orange-700">canceling</Badge>
            <span className="text-muted-foreground">→</span>
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline" className="text-xs">get_*</Badge>
              <Badge variant="outline" className="text-xs">cancel_appointment</Badge>
              <Badge variant="outline" className="text-xs">check_availability</Badge>
              <Badge variant="outline" className="text-xs">escalate_to_human</Badge>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
            <Badge className="bg-purple-500/20 text-purple-700">rescheduling</Badge>
            <span className="text-muted-foreground">→</span>
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline" className="text-xs">get_*</Badge>
              <Badge variant="outline" className="text-xs">check_availability</Badge>
              <Badge variant="outline" className="text-xs">reschedule_appointment</Badge>
              <Badge variant="outline" className="text-xs">escalate_to_human</Badge>
            </div>
          </div>
        </div>

        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>Nota:</strong> As transições de estado ocorrem automaticamente quando uma função é executada com sucesso.
            Por exemplo, <code className="bg-muted px-1 rounded">check_availability()</code> em estado <code className="bg-muted px-1 rounded">idle</code> muda para <code className="bg-muted px-1 rounded">scheduling</code>.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function FunctionCallingTab() {
  const { actions, isLoading } = useActionDefinitions();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  // Group by category
  const grouped = actions?.reduce((acc, action) => {
    const cat = action.category || "system";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(action);
    return acc;
  }, {} as Record<string, ActionDefinition[]>);

  const categoryKeys = grouped ? Object.keys(grouped) : [];

  return (
    <Tabs defaultValue="definitions" className="space-y-4">
      <TabsList>
        <TabsTrigger value="definitions">Definições de Funções</TabsTrigger>
        <TabsTrigger value="rules">Regras de Disponibilidade</TabsTrigger>
      </TabsList>

      <TabsContent value="definitions" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Funções Disponíveis (Function Calling)</CardTitle>
            <CardDescription>
              Edite as descrições para controlar quando a IA deve usar cada função.
              A descrição é enviada à OpenAI junto com a definição da função.
            </CardDescription>
          </CardHeader>
        </Card>

        {grouped && categoryKeys.map((category, index) => {
          const items = grouped[category];
          const categoryInfo = CATEGORY_INFO[category];
          const colorClass = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
          
          return (
            <div key={category} className="space-y-3">
              <div className={`flex items-center gap-3 p-3 rounded-lg border ${colorClass}`}>
                <div className="p-1.5 rounded bg-background/50">
                  {categoryInfo?.icon || <Zap className="h-4 w-4" />}
                </div>
                <h3 className="font-bold text-sm uppercase tracking-wide">
                  {categoryInfo?.label || category.toUpperCase()}
                </h3>
                <Badge variant="outline" className="text-xs ml-auto">
                  {items.length}
                </Badge>
              </div>

              <div className="space-y-2 pl-2">
                {items.map((action) => (
                  <ActionCard key={action.id} action={action} colorClass={colorClass} />
                ))}
              </div>
            </div>
          );
        })}
      </TabsContent>

      <TabsContent value="rules">
        <AvailabilityRulesSection />
      </TabsContent>
    </Tabs>
  );
}

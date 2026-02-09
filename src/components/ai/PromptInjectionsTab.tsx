import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { usePromptInjections, PromptInjection } from "@/hooks/usePromptInjections";
import { useActionDefinitions, ActionDefinition } from "@/hooks/useActionDefinitions";
import { 
  Save, MessageSquare, AlertCircle, ChevronDown, ChevronUp, Zap,
  Calendar, Search, Users, Tag, Settings, Info, List, Building2
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  greeting: { label: "SAUDAÇÃO", icon: <MessageSquare className="h-4 w-4" /> },
  system: { label: "SISTEMA", icon: <AlertCircle className="h-4 w-4" /> },
  information: { label: "INFORMAÇÃO", icon: <Info className="h-4 w-4" /> },
  scheduling: { label: "AGENDAMENTO", icon: <Calendar className="h-4 w-4" /> },
  management: { label: "GERENCIAMENTO", icon: <Settings className="h-4 w-4" /> },
  busca: { label: "BUSCA", icon: <Search className="h-4 w-4" /> },
  consulting: { label: "CONSULTA", icon: <List className="h-4 w-4" /> },
  contato: { label: "CONTATO", icon: <Users className="h-4 w-4" /> },
  escalacao: { label: "ESCALAÇÃO", icon: <AlertCircle className="h-4 w-4" /> },
  tags: { label: "TAGS", icon: <Tag className="h-4 w-4" /> },
  agendamento: { label: "AGENDAMENTO", icon: <Calendar className="h-4 w-4" /> },
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  get_company_info: <Building2 className="h-4 w-4" />,
  handleGetCompanyInfo: <Building2 className="h-4 w-4" />,
  get_professionals: <Users className="h-4 w-4" />,
  handleGetProfessionals: <Users className="h-4 w-4" />,
  get_services: <Zap className="h-4 w-4" />,
  handleGetServices: <Zap className="h-4 w-4" />,
  get_professional_services: <Users className="h-4 w-4" />,
  handleProfessionalServices: <Users className="h-4 w-4" />,
  get_service_professionals: <Zap className="h-4 w-4" />,
  handleServiceProfessionals: <Zap className="h-4 w-4" />,
  check_availability: <Calendar className="h-4 w-4" />,
  handleCheckAvailability: <Calendar className="h-4 w-4" />,
  create_appointment: <Calendar className="h-4 w-4" />,
  handleCreateAppointment: <Calendar className="h-4 w-4" />,
  cancel_appointment: <Calendar className="h-4 w-4" />,
  handleCancelAppointment: <Calendar className="h-4 w-4" />,
  reschedule_appointment: <Calendar className="h-4 w-4" />,
  handleRescheduleAppointment: <Calendar className="h-4 w-4" />,
  list_appointments: <List className="h-4 w-4" />,
  handleListAppointments: <List className="h-4 w-4" />,
  search_contact: <Search className="h-4 w-4" />,
  search_faq: <Search className="h-4 w-4" />,
  update_contact: <Users className="h-4 w-4" />,
  create_contact: <Users className="h-4 w-4" />,
  add_tag: <Tag className="h-4 w-4" />,
  remove_tag: <Tag className="h-4 w-4" />,
};

function PromptCard({ injection, colorClass }: { injection: PromptInjection; colorClass: string }) {
  const { updateInjection } = usePromptInjections();
  const [content, setContent] = useState(injection.content);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges = content !== injection.content;

  const handleSave = async () => {
    setIsSaving(true);
    await updateInjection.mutateAsync({ id: injection.id, content });
    setIsSaving(false);
  };

  const handleToggleActive = async (checked: boolean) => {
    await updateInjection.mutateAsync({ id: injection.id, is_active: checked });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-border/50">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-md ${colorClass}`}>
                  {CATEGORY_INFO[injection.category]?.icon || <MessageSquare className="h-4 w-4" />}
                </div>
                <div>
                  <CardTitle className="text-base">{injection.name}</CardTitle>
                  {injection.description && (
                    <CardDescription className="text-xs mt-1">
                      {injection.description}
                    </CardDescription>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="font-mono text-xs">
                  {injection.key}
                </Badge>
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id={`active-${injection.id}`}
                  checked={injection.is_active ?? true}
                  onCheckedChange={handleToggleActive}
                />
                <Label htmlFor={`active-${injection.id}`} className="text-sm">
                  Ativo
                </Label>
              </div>

              {injection.variables && injection.variables.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Variáveis:</span>
                  <div className="flex gap-1 flex-wrap">
                    {injection.variables.map((v) => (
                      <Badge key={v} variant="secondary" className="text-xs font-mono">
                        {`{${v}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="font-mono text-sm"
              placeholder="Conteúdo do prompt..."
            />

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
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function FunctionResponseCard({ action, colorClass }: { action: ActionDefinition; colorClass: string }) {
  const { updateAction } = useActionDefinitions();
  const [instruction, setInstruction] = useState(action.response_instruction || "");
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges = instruction !== (action.response_instruction || "");

  const handleSave = async () => {
    setIsSaving(true);
    await updateAction.mutateAsync({ 
      id: action.id, 
      response_instruction: instruction || null 
    });
    setIsSaving(false);
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
                  <CardTitle className="text-base font-mono">{action.handler}</CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {action.name}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {action.response_instruction ? (
                  <Badge variant="default" className="text-xs bg-green-500/20 text-green-600 border-green-500/30">
                    Configurado
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    Não configurado
                  </Badge>
                )}
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
              Esta instrução será enviada à IA junto com o resultado da função, 
              orientando como interpretar e apresentar os dados ao cliente.
            </div>

            {action.handler === "check_availability" && (
              <div className="text-xs bg-blue-500/10 text-blue-600 p-3 rounded-md border border-blue-500/20">
                <span className="font-semibold">Variável disponível:</span>{" "}
                <code className="bg-blue-500/20 px-1.5 py-0.5 rounded font-mono">{"{show_next_slots}"}</code>
                <span className="text-muted-foreground ml-1">
                  — será substituída pelo número de horários configurado em "Configurações de Agendamento IA"
                </span>
              </div>
            )}

            <Textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              rows={4}
              className="font-mono text-sm"
              placeholder="Ex: Liste os profissionais de forma clara e objetiva, destacando a especialidade de cada um..."
            />

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
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export function PromptInjectionsTab() {
  const { injections, isLoading: injectionsLoading } = usePromptInjections();
  const { actions, isLoading: actionsLoading } = useActionDefinitions();

  const isLoading = injectionsLoading || actionsLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  // Group injections by category
  const grouped = injections?.reduce((acc, inj) => {
    const cat = inj.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(inj);
    return acc;
  }, {} as Record<string, PromptInjection[]>);

  const injectionCategoryKeys = grouped ? Object.keys(grouped) : [];

  // Filter actions that support response instructions (exclude per-company ones)
  const configurableActions = actions?.filter(
    (a) => !['escalate_human', 'mark_urgent'].includes(a.handler)
  ) || [];

  // Group actions by category for response instructions
  const groupedActions = configurableActions.reduce((acc, action) => {
    const cat = action.category || "system";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(action);
    return acc;
  }, {} as Record<string, ActionDefinition[]>);

  const actionCategoryKeys = Object.keys(groupedActions);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Prompt Injections</CardTitle>
          <CardDescription>
            Prompts dinâmicos injetados em momentos específicos da conversa e instruções 
            que acompanham os resultados das funções chamadas pela IA.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="context" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="context" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Context Injections
          </TabsTrigger>
          <TabsTrigger value="functions" className="gap-2">
            <Zap className="h-4 w-4" />
            Function Response Instructions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="context" className="mt-6 space-y-6">
          {grouped && injectionCategoryKeys.map((category, index) => {
            const items = grouped[category];
            const categoryInfo = CATEGORY_INFO[category];
            const colorClass = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
            
            return (
              <div key={category} className="space-y-3">
                <div className={`flex items-center gap-3 p-3 rounded-lg border ${colorClass}`}>
                  <div className="p-1.5 rounded bg-background/50">
                    {categoryInfo?.icon || <MessageSquare className="h-4 w-4" />}
                  </div>
                  <h3 className="font-bold text-sm uppercase tracking-wide">
                    {categoryInfo?.label || category.toUpperCase()}
                  </h3>
                  <Badge variant="outline" className="text-xs ml-auto">
                    {items.length}
                  </Badge>
                </div>

                <div className="space-y-3 pl-2">
                  {items.map((injection) => (
                    <PromptCard key={injection.id} injection={injection} colorClass={colorClass} />
                  ))}
                </div>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="functions" className="mt-6 space-y-6">
          <div className="text-sm text-muted-foreground mb-4">
            Configure instruções que serão enviadas à IA junto com o resultado de cada função.
            Isso permite orientar como a IA deve interpretar e apresentar os dados ao cliente.
          </div>

          {actionCategoryKeys.map((category, index) => {
            const items = groupedActions[category];
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

                <div className="space-y-3 pl-2">
                  {items.map((action) => (
                    <FunctionResponseCard key={action.id} action={action} colorClass={colorClass} />
                  ))}
                </div>
              </div>
            );
          })}

          {configurableActions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma função configurável encontrada.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

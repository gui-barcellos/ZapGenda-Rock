import { useState, useEffect } from "react";
import CompanyLayout from "@/components/layout/CompanyLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useSchedulingRules } from "@/hooks/useSchedulingRules";
import { Calendar, Clock, Settings, Bot, User } from "lucide-react";
import { toast } from "sonner";

const SchedulingRules = () => {
  const { rules, isLoading, updateRules } = useSchedulingRules();
  
  // Modo de agendamento
  const [schedulingMode, setSchedulingMode] = useState<'rolling' | 'monthly'>('rolling');
  
  // Janela Deslizante - Regras da IA
  const [minAdvanceHoursAI, setMinAdvanceHoursAI] = useState(2);
  const [maxAdvanceDaysAI, setMaxAdvanceDaysAI] = useState(30);
  
  // Janela Deslizante - Regras do Atendente
  const [minAdvanceHoursManual, setMinAdvanceHoursManual] = useState(1);
  const [maxAdvanceDaysManual, setMaxAdvanceDaysManual] = useState(180);
  
  // Abertura Mensal
  const [openingType, setOpeningType] = useState<'date_range' | 'week_defined'>('date_range');
  const [openingStartDay, setOpeningStartDay] = useState(1);
  const [openingEndDay, setOpeningEndDay] = useState(5);
  const [openingWeek, setOpeningWeek] = useState<'first' | 'second' | 'third' | 'fourth' | 'last'>('first');
  const [monthsAheadVisible, setMonthsAheadVisible] = useState(1);
  
  // Outras regras
  const [autoMarkNoShow, setAutoMarkNoShow] = useState(false);
  const [autoMarkNoShowHours, setAutoMarkNoShowHours] = useState(2);

  useEffect(() => {
    if (rules) {
      setSchedulingMode(rules.scheduling_mode || 'rolling');
      setMinAdvanceHoursAI(rules.min_advance_hours_ai || 2);
      setMaxAdvanceDaysAI(rules.max_advance_days_ai || 30);
      setMinAdvanceHoursManual(rules.min_advance_hours_manual || 1);
      setMaxAdvanceDaysManual(rules.max_advance_days_manual || 180);
      setOpeningType(rules.opening_type || 'date_range');
      setOpeningStartDay(rules.opening_start_day || 1);
      setOpeningEndDay(rules.opening_end_day || 5);
      setOpeningWeek(rules.opening_week || 'first');
      setMonthsAheadVisible(rules.months_ahead_visible || 1);
      setAutoMarkNoShow(rules.auto_mark_no_show_enabled ?? false);
      setAutoMarkNoShowHours(rules.auto_mark_no_show_hours ?? 2);
    }
  }, [rules]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // ========== VALIDAÇÕES ==========
    
    if (schedulingMode === 'rolling') {
      // Validação IA
      if (minAdvanceHoursAI < 0) {
        toast.error("Antecedência mínima da IA não pode ser negativa");
        return;
      }
      if (maxAdvanceDaysAI < 1) {
        toast.error("Antecedência máxima da IA deve ser no mínimo 1 dia");
        return;
      }
      if (minAdvanceHoursAI / 24 > maxAdvanceDaysAI) {
        toast.error("Antecedência mínima da IA não pode ser maior que a máxima");
        return;
      }
      
      // Validação Atendente
      if (minAdvanceHoursManual < 0) {
        toast.error("Antecedência mínima do atendente não pode ser negativa");
        return;
      }
      if (maxAdvanceDaysManual < 1) {
        toast.error("Antecedência máxima do atendente deve ser no mínimo 1 dia");
        return;
      }
      if (minAdvanceHoursManual / 24 > maxAdvanceDaysManual) {
        toast.error("Antecedência mínima do atendente não pode ser maior que a máxima");
        return;
      }
    }
    
    if (schedulingMode === 'monthly') {
      if (openingType === 'date_range') {
        if (openingStartDay < 1 || openingStartDay > 31) {
          toast.error("Dia inicial deve estar entre 1 e 31");
          return;
        }
        if (openingEndDay < 1 || openingEndDay > 31) {
          toast.error("Dia final deve estar entre 1 e 31");
          return;
        }
        if (openingStartDay >= openingEndDay) {
          toast.error("Dia inicial deve ser menor que dia final");
          return;
        }
      }
      
      if (monthsAheadVisible < 1 || monthsAheadVisible > 12) {
        toast.error("Meses visíveis deve estar entre 1 e 12");
        return;
      }
    }
    
    if (autoMarkNoShow) {
      if (autoMarkNoShowHours < 1) {
        toast.error("Horas para marcar ausência deve ser no mínimo 1 hora");
        return;
      }
      if (autoMarkNoShowHours > 48) {
        toast.error("Horas para marcar ausência não pode exceder 48 horas");
        return;
      }
    }
    
    // ========== SALVAR ==========
    
    updateRules.mutate({
      min_advance_hours: minAdvanceHoursManual,
      max_advance_days: maxAdvanceDaysManual,
      min_advance_hours_ai: minAdvanceHoursAI,
      max_advance_days_ai: maxAdvanceDaysAI,
      min_advance_hours_manual: minAdvanceHoursManual,
      max_advance_days_manual: maxAdvanceDaysManual,
      scheduling_mode: schedulingMode,
      open_next_month_on_day: openingStartDay, // mantém compatibilidade
      months_ahead_visible: monthsAheadVisible,
      opening_type: openingType,
      opening_start_day: openingStartDay,
      opening_end_day: openingEndDay,
      opening_week: openingWeek,
      auto_mark_no_show_enabled: autoMarkNoShow,
      auto_mark_no_show_hours: autoMarkNoShowHours,
    });
  };

  return (
    <CompanyLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Regras de Agendamento</h1>
          <p className="text-muted-foreground mt-2">
            Configure como a agenda funciona para IA e atendentes
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card 1: Modo de Agendamento */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Modo de Agendamento</CardTitle>
              </div>
              <CardDescription>
                Escolha como a agenda será disponibilizada
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={schedulingMode} onValueChange={(value: 'rolling' | 'monthly') => setSchedulingMode(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="rolling" id="rolling" />
                  <Label htmlFor="rolling" className="cursor-pointer font-normal">
                    <div>
                      <div className="font-medium">Janela Deslizante</div>
                      <div className="text-sm text-muted-foreground">
                        Agenda sempre disponível até X dias no futuro
                      </div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="monthly" id="monthly" />
                  <Label htmlFor="monthly" className="cursor-pointer font-normal">
                    <div>
                      <div className="font-medium">Abertura Mensal</div>
                      <div className="text-sm text-muted-foreground">
                        Agenda abre mês a mês em período ou semana específica
                      </div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Card 2: Configurações Janela Deslizante */}
          {schedulingMode === 'rolling' && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Configurações da Janela Deslizante</CardTitle>
                </div>
                <CardDescription>
                  Defina os limites de agendamento para IA e atendentes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Seção IA */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-primary" />
                    <h4 className="font-medium">Para IA</h4>
                    <Badge variant="secondary" className="text-xs">Automático</Badge>
                  </div>
                  
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="minAdvanceHoursAI">
                        Antecedência Mínima (horas)
                      </Label>
                      <Input
                        id="minAdvanceHoursAI"
                        type="number"
                        min="1"
                        value={minAdvanceHoursAI}
                        onChange={(e) => setMinAdvanceHoursAI(Number(e.target.value))}
                        disabled={isLoading}
                      />
                      <p className="text-xs text-muted-foreground">
                        Mínimo de 1 hora
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="maxAdvanceDaysAI">
                        Dias à Frente
                      </Label>
                      <Input
                        id="maxAdvanceDaysAI"
                        type="number"
                        min="1"
                        value={maxAdvanceDaysAI}
                        onChange={(e) => setMaxAdvanceDaysAI(Number(e.target.value))}
                        disabled={isLoading}
                      />
                      <p className="text-xs text-muted-foreground">
                        Recomendado: 30-60 dias
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Seção Atendente */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <h4 className="font-medium">Para Atendente</h4>
                    <Badge variant="secondary" className="text-xs">Manual</Badge>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="minAdvanceHoursManual">
                        Antecedência Mínima (horas)
                      </Label>
                      <Input
                        id="minAdvanceHoursManual"
                        type="number"
                        min="1"
                        value={minAdvanceHoursManual}
                        onChange={(e) => setMinAdvanceHoursManual(Number(e.target.value))}
                        disabled={isLoading}
                      />
                      <p className="text-xs text-muted-foreground">
                        Mínimo de 1 hora
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="maxAdvanceDaysManual">
                        Dias à Frente
                      </Label>
                      <Input
                        id="maxAdvanceDaysManual"
                        type="number"
                        min="1"
                        value={maxAdvanceDaysManual}
                        onChange={(e) => setMaxAdvanceDaysManual(Number(e.target.value))}
                        disabled={isLoading}
                      />
                      <p className="text-xs text-muted-foreground">
                        Recomendado: 180-365 dias
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Card 3: Configurações Abertura Mensal */}
          {schedulingMode === 'monthly' && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Configurações da Abertura Mensal</CardTitle>
                </div>
                <CardDescription>
                  Defina quando a agenda do próximo mês será aberta
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Tipo de Abertura</Label>
                  <RadioGroup value={openingType} onValueChange={(value: 'date_range' | 'week_defined') => setOpeningType(value)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="date_range" id="date_range" />
                      <Label htmlFor="date_range" className="cursor-pointer font-normal">
                        Data Definida
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="week_defined" id="week_defined" />
                      <Label htmlFor="week_defined" className="cursor-pointer font-normal">
                        Semana Definida
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {openingType === 'date_range' && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <h4 className="font-medium">Intervalo de Abertura</h4>
                      <div className="flex items-center gap-4">
                        <div className="space-y-2 flex-1">
                          <Label htmlFor="openingStartDay">Do dia</Label>
                          <Input
                            id="openingStartDay"
                            type="number"
                            min="1"
                            max="31"
                            value={openingStartDay}
                            onChange={(e) => setOpeningStartDay(Number(e.target.value))}
                            disabled={isLoading}
                          />
                        </div>
                        <div className="space-y-2 flex-1">
                          <Label htmlFor="openingEndDay">Até o dia</Label>
                          <Input
                            id="openingEndDay"
                            type="number"
                            min="1"
                            max="31"
                            value={openingEndDay}
                            onChange={(e) => setOpeningEndDay(Number(e.target.value))}
                            disabled={isLoading}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Ex: Do dia 1 ao dia 7 = a agenda do próximo mês abre entre os dias 1 e 7 do mês atual
                      </p>
                    </div>
                  </>
                )}

                {openingType === 'week_defined' && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <h4 className="font-medium">Semana de Abertura</h4>
                      <div className="space-y-2">
                        <Label htmlFor="openingWeek">Selecione a semana</Label>
                        <Select value={openingWeek} onValueChange={(value: any) => setOpeningWeek(value)}>
                          <SelectTrigger id="openingWeek">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="first">1ª semana do mês (dias 1-7)</SelectItem>
                            <SelectItem value="second">2ª semana do mês (dias 8-14)</SelectItem>
                            <SelectItem value="third">3ª semana do mês (dias 15-21)</SelectItem>
                            <SelectItem value="fourth">4ª semana do mês (dias 22-28)</SelectItem>
                            <SelectItem value="last">Última semana (últimos 7 dias)</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          A agenda do próximo mês abre na semana selecionada
                        </p>
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="monthsAhead">
                    Quantos meses à frente ficam visíveis
                  </Label>
                  <Input
                    id="monthsAhead"
                    type="number"
                    min="1"
                    max="6"
                    value={monthsAheadVisible}
                    onChange={(e) => setMonthsAheadVisible(Number(e.target.value))}
                    disabled={isLoading}
                    className="w-32"
                  />
                  <p className="text-xs text-muted-foreground">
                    Quantos meses à frente estarão disponíveis para agendamento
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Card 4: Outras Configurações */}

          {/* Outras Configurações */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Outras Configurações</CardTitle>
              </div>
              <CardDescription>
                Regras adicionais de agendamento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="autoMarkNoShow">
                      Auto-marcar como "Não Compareceu"
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Marcar automaticamente agendamentos como "Não Compareceu" após X horas do horário agendado
                    </p>
                  </div>
                  <Switch
                    id="autoMarkNoShow"
                    checked={autoMarkNoShow}
                    onCheckedChange={setAutoMarkNoShow}
                    disabled={isLoading}
                  />
                </div>

                {autoMarkNoShow && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label htmlFor="autoMarkNoShowHours">
                        Horas após o horário do agendamento
                      </Label>
                      <Input
                        id="autoMarkNoShowHours"
                        type="number"
                        min="1"
                        max="24"
                        value={autoMarkNoShowHours}
                        onChange={(e) => setAutoMarkNoShowHours(Number(e.target.value))}
                        disabled={isLoading}
                        className="w-32"
                      />
                      <p className="text-xs text-muted-foreground">
                        Mínimo de 1 hora (máximo 24h)
                      </p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Button type="submit" disabled={isLoading || updateRules.isPending}>
            {updateRules.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </form>
      </div>
    </CompanyLayout>
  );
};

export default SchedulingRules;

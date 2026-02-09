import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import CompanyLayout from "@/components/layout/CompanyLayout";
import { useAIUsage } from "@/hooks/useAIUsage";
import { useAIConfiguration, useUpdateAIConfiguration } from "@/hooks/useAIConfiguration";
import { useAIPrerequisites } from "@/hooks/useAIPrerequisites";
import { AIUsageStats } from "@/components/ai/AIUsageStats";
import { TokenUsageChart } from "@/components/dashboard/TokenUsageChart";
import { AudioTranscriptionsChart } from "@/components/ai/AudioTranscriptionsChart";
import { AIPersonalitySection } from "@/components/ai/AIPersonalitySection";
import { AIInstructionsSection } from "@/components/ai/AIInstructionsSection";
import { AIEscalationSection } from "@/components/ai/AIEscalationSection";
import { AIUrgencySection } from "@/components/ai/AIUrgencySection";
import { AISchedulingSection } from "@/components/ai/AISchedulingSection";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyData } from "@/hooks/useCompanyData";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
const AIUsage = () => {
  const {
    user
  } = useAuth();
  const {
    companyData
  } = useCompanyData();
  const {
    data,
    isLoading,
    error
  } = useAIUsage();
  const {
    data: aiConfig,
    isLoading: configLoading
  } = useAIConfiguration();
  const {
    data: prerequisites,
    isLoading: prereqLoading
  } = useAIPrerequisites();
  const updateConfig = useUpdateAIConfiguration();
  const [aiName, setAIName] = useState("");
  const [greetingMessage, setGreetingMessage] = useState("");
  const [aiInstructions, setAIInstructions] = useState("");
  const [aiEnabled, setAIEnabled] = useState(true);
  const [escalationRules, setEscalationRules] = useState("");
  const [escalationSoundEnabled, setEscalationSoundEnabled] = useState(true);
  const [escalationSoundType, setEscalationSoundType] = useState<'notification1' | 'notification2' | 'notification3'>('notification2');
  const [urgencyRules, setUrgencyRules] = useState("");
  const [urgencySoundEnabled, setUrgencySoundEnabled] = useState(true);
  const [urgencySoundType, setUrgencySoundType] = useState<'alert1' | 'alert2' | 'alert3'>('alert2');
  const [showNextSlots, setShowNextSlots] = useState(3);

  // Initialize form with current config
  useEffect(() => {
    if (aiConfig) {
      setAIName(aiConfig.ai_name);
      setGreetingMessage(aiConfig.greeting_message);
      setAIInstructions(aiConfig.ai_instructions || "");
      setAIEnabled(aiConfig.ai_enabled);
      setEscalationRules(aiConfig.escalation_rules);
      setEscalationSoundEnabled(aiConfig.escalation_sound_enabled || false);
      setEscalationSoundType(aiConfig.escalation_sound_type || 'notification2');
      setUrgencyRules(aiConfig.urgency_rules);
      setUrgencySoundEnabled(aiConfig.urgency_sound_enabled);
      setUrgencySoundType(aiConfig.urgency_sound_type);
      setShowNextSlots(aiConfig.show_next_slots);
    }
  }, [aiConfig]);
  const handleSave = () => {
    // Se está tentando ativar IA mas faltam requisitos, bloqueia
    if (aiEnabled && !prerequisites?.canEnableAI) {
      toast.error("Complete todos os requisitos antes de ativar a IA");
      return;
    }
    updateConfig.mutate({
      ai_name: aiName,
      greeting_message: greetingMessage,
      ai_instructions: aiInstructions || null,
      ai_enabled: aiEnabled,
      escalation_rules: escalationRules,
      escalation_sound_enabled: escalationSoundEnabled,
      escalation_sound_type: escalationSoundType,
      urgency_rules: urgencyRules,
      urgency_sound_enabled: urgencySoundEnabled,
      urgency_sound_type: urgencySoundType,
      show_next_slots: showNextSlots
    });
  };
  const {
    data: transcriptionData
  } = useQuery({
    queryKey: ["audio-transcriptions"],
    queryFn: async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return null;
      const {
        data: profile
      } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
      if (!profile?.company_id) return null;
      const {
        data: transcriptions
      } = await supabase.from("audio_transcription_usage").select("*").eq("company_id", profile.company_id).order("created_at", {
        ascending: false
      }).limit(50);
      const groupedByDate = transcriptions?.reduce((acc: Record<string, number>, item) => {
        const date = new Date(item.created_at).toISOString().split("T")[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});
      return {
        chartData: Object.entries(groupedByDate || {}).map(([date, count]) => ({
          date,
          count
        }))
      };
    }
  });
  if (error) {
    return <CompanyLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Erro ao carregar dados de uso de IA: {error.message}
          </AlertDescription>
        </Alert>
      </CompanyLayout>;
  }
  if (isLoading || configLoading) {
    return <CompanyLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </CompanyLayout>;
  }
  return <CompanyLayout>
      <div className="space-y-6 mx-[20px]">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Configuração de IA</h1>
            <p className="text-muted-foreground mt-2">
              Configure a assistente virtual e monitore o uso de tokens
            </p>
          </div>
          <Button onClick={handleSave} disabled={updateConfig.isPending}>
            {updateConfig.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>

        {/* Alert de Pré-requisitos Faltantes */}
        {!prereqLoading && prerequisites && !prerequisites.canEnableAI && <Alert variant="destructive" className="border-2">
            <AlertCircle className="h-5 w-5" />
            <AlertDescription>
              <p className="font-semibold text-base mb-3">
                ⚠️ A IA não pode ser ativada até que os seguintes requisitos sejam preenchidos:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm">
                {prerequisites.missingItems.map((item, i) => <li key={i} className="ml-2">{item}</li>)}
              </ul>
            </AlertDescription>
          </Alert>}

        {/* AI Enable/Disable */}
        <Card>
          <CardHeader>
            <CardTitle>Visão Geral</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
              <div className="space-y-0.5">
                <Label htmlFor="ai-enabled" className="text-base font-semibold">
                  Assistente Virtual Ativa
                </Label>
                <p className="text-sm text-muted-foreground">
                  {prerequisites?.canEnableAI ? "Habilitar ou desabilitar a IA para todas as conversas" : "Complete os requisitos acima para ativar a IA"}
                </p>
              </div>
              <Switch id="ai-enabled" checked={aiEnabled} onCheckedChange={setAIEnabled} disabled={!prerequisites?.canEnableAI || prereqLoading} />
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Personality Section */}
        <AIPersonalitySection aiName={aiName} greetingMessage={greetingMessage} companyName={companyData?.name || "Sua Empresa"} onAINameChange={setAIName} onGreetingMessageChange={setGreetingMessage} />

        {/* Instructions Section */}
        <AIInstructionsSection aiInstructions={aiInstructions} onAIInstructionsChange={setAIInstructions} />

        {/* Escalation Section */}
        <AIEscalationSection escalationRules={escalationRules} escalationSoundEnabled={escalationSoundEnabled} escalationSoundType={escalationSoundType} onEscalationRulesChange={setEscalationRules} onEscalationSoundEnabledChange={setEscalationSoundEnabled} onEscalationSoundTypeChange={setEscalationSoundType} />

        {/* Urgency Section */}
        <AIUrgencySection urgencyRules={urgencyRules} urgencySoundEnabled={urgencySoundEnabled} urgencySoundType={urgencySoundType} onUrgencyRulesChange={setUrgencyRules} onUrgencySoundEnabledChange={setUrgencySoundEnabled} onUrgencySoundTypeChange={setUrgencySoundType} />

        {/* Scheduling Section */}
        <AISchedulingSection showNextSlots={showNextSlots} onShowNextSlotsChange={setShowNextSlots} />

        <Separator />

        <div>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Monitoramento de Uso</h2>
          <p className="text-muted-foreground mb-6">
            Acompanhe o consumo de tokens de IA e transcrições de áudio
          </p>
        </div>

        {data?.subscription ? <>
            <AIUsageStats currentTokens={data.subscription.current_ai_tokens || 0} maxTokens={data.subscription.max_ai_tokens || 0} usageByType={data.usageByType} audioTranscriptionCount={data.audioTranscriptionCount} onUpgrade={() => {
          console.log('Upgrade clicked');
        }} />
            
            <TokenUsageChart />
            
            {transcriptionData?.chartData && transcriptionData.chartData.length > 0 && <AudioTranscriptionsChart data={transcriptionData.chartData} />}
          </> : null}
      </div>
    </CompanyLayout>;
};
export default AIUsage;
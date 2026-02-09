import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { UserRound, Volume2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
interface AIEscalationSectionProps {
  escalationRules: string;
  escalationSoundEnabled: boolean;
  escalationSoundType: 'notification1' | 'notification2' | 'notification3';
  onEscalationRulesChange: (value: string) => void;
  onEscalationSoundEnabledChange: (value: boolean) => void;
  onEscalationSoundTypeChange: (value: 'notification1' | 'notification2' | 'notification3') => void;
}
export function AIEscalationSection({
  escalationRules,
  escalationSoundEnabled,
  escalationSoundType,
  onEscalationRulesChange,
  onEscalationSoundEnabledChange,
  onEscalationSoundTypeChange
}: AIEscalationSectionProps) {
  const soundOptions = [{
    value: 'notification1',
    label: 'Notificação Suave',
    description: 'Som discreto e profissional'
  }, {
    value: 'notification2',
    label: 'Alerta Moderado',
    description: 'Som equilibrado, chama atenção'
  }, {
    value: 'notification3',
    label: 'Notificação Insistente',
    description: 'Som mais forte e persistente'
  }];
  const playSound = (soundType: 'notification1' | 'notification2' | 'notification3') => {
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    const configs = {
      notification1: {
        frequency: 800,
        duration: 0.2,
        beeps: 1
      },
      notification2: {
        frequency: 1000,
        duration: 0.15,
        beeps: 2
      },
      notification3: {
        frequency: 1200,
        duration: 0.2,
        beeps: 3
      }
    };
    const config = configs[soundType];
    oscillator.frequency.value = config.frequency;
    let time = audioContext.currentTime;
    for (let i = 0; i < config.beeps; i++) {
      gainNode.gain.setValueAtTime(0, time);
      gainNode.gain.linearRampToValueAtTime(0.3, time + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, time + config.duration);
      time += config.duration + 0.1;
    }
    oscillator.start(audioContext.currentTime);
    oscillator.stop(time);
  };
  return <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserRound className="h-5 w-5" />
          Quando Chamar Humano
        </CardTitle>
        <CardDescription>
          Defina as regras para a IA transferir a conversa para atendimento humano
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border-l-4 border-l-primary bg-primary/5 p-4">
          <p className="text-sm font-medium text-foreground mb-2">💡 Diferença entre Chamar Humano e Urgente:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li><strong>Chamar Humano:</strong> Situações que precisam de toque humano, mas podem aguardar alguns minutos/horas</li>
            <li><strong>Acionar Urgente:</strong> Problemas que exigem ação IMEDIATA, com alerta sonoro para a equipe</li>
          </ul>
        </div>

        <div className="space-y-2">
          <Label htmlFor="escalation-rules">Regras de Escalação</Label>
          <Textarea id="escalation-rules" value={escalationRules} onChange={e => onEscalationRulesChange(e.target.value)} placeholder="Ex: Acionar humano quando houver reclamação ou situação complexa..." className="min-h-[120px]" />
          <p className="text-sm text-muted-foreground">
            Descreva em quais situações a IA deve transferir para um atendente humano
          </p>
        </div>

        <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
          <p className="text-sm text-foreground font-medium">Dicas de quando "chamar humano":</p>
          
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">✅ Quando ativar:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Reclamações, conflitos ou situações sensíveis</li>
              <li>Erros ou problemas que fogem do padrão</li>
              <li>Cliente insiste após resposta clara ou pede explicitamente para falar com alguém</li>
              
              <li>Elogios relevantes que merecem reconhecimento pessoal</li>
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">❌ Quando NÃO ativar:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Dúvidas simples ou perguntas frequentes</li>
              <li>Curiosidade ou pedidos de informação</li>
              <li>Confusão leve que pode ser esclarecida</li>
              <li>Pedidos de desconto (a menos que seja política da empresa)</li>
              <li>Perguntas fora do escopo (apenas informe o que você oferece)</li>
            </ul>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Tag Aplicada Automaticamente</Label>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100">
              Aguardando Humano
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">Esta tag será aplicada automaticamente à conversa quando for transferida.</p>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="escalation-sound-enabled" className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                Notificação Sonora
              </Label>
              <p className="text-sm text-muted-foreground">
                Reproduzir som quando um atendente humano for solicitado
              </p>
            </div>
            <Switch id="escalation-sound-enabled" checked={escalationSoundEnabled} onCheckedChange={onEscalationSoundEnabledChange} />
          </div>

          {escalationSoundEnabled && <div className="space-y-3 pl-6">
              <Label>Tipo de Notificação</Label>
              <RadioGroup value={escalationSoundType} onValueChange={onEscalationSoundTypeChange}>
                {soundOptions.map(option => <div key={option.value} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                    <div className="flex items-start space-x-3 space-y-0 flex-1">
                      <RadioGroupItem value={option.value} id={`escalation-${option.value}`} />
                      <div className="space-y-1 leading-none">
                        <Label htmlFor={`escalation-${option.value}`} className="font-normal cursor-pointer">
                          {option.label}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {option.description}
                        </p>
                      </div>
                    </div>
                    <button type="button" onClick={() => playSound(option.value as 'notification1' | 'notification2' | 'notification3')} className="px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                      Ouvir
                    </button>
                  </div>)}
              </RadioGroup>
            </div>}
        </div>
      </CardContent>
    </Card>;
}
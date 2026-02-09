import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertTriangle, Volume2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AIUrgencySectionProps {
  urgencyRules: string;
  urgencySoundEnabled: boolean;
  urgencySoundType: 'alert1' | 'alert2' | 'alert3';
  onUrgencyRulesChange: (value: string) => void;
  onUrgencySoundEnabledChange: (value: boolean) => void;
  onUrgencySoundTypeChange: (value: 'alert1' | 'alert2' | 'alert3') => void;
}

export function AIUrgencySection({
  urgencyRules,
  urgencySoundEnabled,
  urgencySoundType,
  onUrgencyRulesChange,
  onUrgencySoundEnabledChange,
  onUrgencySoundTypeChange,
}: AIUrgencySectionProps) {
  const soundOptions = [
    { value: 'alert1', label: 'Sirene Moderada', description: 'Som de alerta médio' },
    { value: 'alert2', label: 'Sirene Intensa', description: 'Som de sirene forte' },
    { value: 'alert3', label: 'Sirene Emergência', description: 'Som de emergência máxima' }
  ];

  const playSound = (soundType: 'alert1' | 'alert2' | 'alert3') => {
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Sons tipo sirene com frequência variável
    const configs = {
      alert1: { startFreq: 600, endFreq: 1000, duration: 0.5, cycles: 2 },
      alert2: { startFreq: 700, endFreq: 1400, duration: 0.4, cycles: 3 },
      alert3: { startFreq: 800, endFreq: 1600, duration: 0.3, cycles: 4 }
    };
    
    const config = configs[soundType];
    oscillator.type = 'triangle'; // Som de sirene
    
    let time = audioContext.currentTime;
    for (let i = 0; i < config.cycles; i++) {
      // Subida
      oscillator.frequency.setValueAtTime(config.startFreq, time);
      oscillator.frequency.linearRampToValueAtTime(config.endFreq, time + config.duration / 2);
      // Descida
      oscillator.frequency.linearRampToValueAtTime(config.startFreq, time + config.duration);
      
      gainNode.gain.setValueAtTime(0, time);
      gainNode.gain.linearRampToValueAtTime(0.4, time + 0.05);
      gainNode.gain.linearRampToValueAtTime(0.4, time + config.duration - 0.05);
      gainNode.gain.linearRampToValueAtTime(0, time + config.duration);
      
      time += config.duration;
    }
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(time);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Quando Acionar Urgente
        </CardTitle>
        <CardDescription>
          Defina as regras para marcar casos urgentes que precisam de atenção imediata
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border-l-4 border-l-destructive bg-destructive/5 p-4">
          <p className="text-sm font-medium text-foreground mb-2">⚡ Diferença entre Urgente e Chamar Humano:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li><strong>Urgente:</strong> Ação IMEDIATA necessária, com alarme sonoro para equipe</li>
            <li><strong>Chamar Humano:</strong> Necessita atenção humana, mas sem urgência extrema</li>
          </ul>
        </div>

        <div className="space-y-2">
          <Label htmlFor="urgency-rules">Regras de Urgência</Label>
          <Textarea
            id="urgency-rules"
            value={urgencyRules}
            onChange={(e) => onUrgencyRulesChange(e.target.value)}
            placeholder="Ex: Acionar urgente quando houver emergência médica ou problema crítico..."
            className="min-h-[120px]"
          />
          <p className="text-sm text-muted-foreground">
            Descreva em quais situações a IA deve marcar como urgente
          </p>
        </div>

        <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
          <p className="text-sm text-foreground font-medium">Dicas de quando ativar:</p>
          
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">✅ Quando ativar:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Erro grave em andamento (agendamento duplicado, cobrança incorreta)</li>
              <li>Cliente relatando dor, emergência física ou reação adversa</li>
              <li>Ameaça de cancelamento ou conflito escalado</li>
              <li>Reclamação pública ou risco de exposição negativa</li>
              <li>Cliente presente no local com problema urgente</li>
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">❌ Quando NÃO ativar:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Dúvidas comuns ou pedidos de informação</li>
              <li>Insatisfações leves ou reclamações rotineiras</li>
              <li>Solicitações que podem aguardar horário comercial</li>
              <li>Curiosidade ou perguntas sem urgência real</li>
            </ul>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Tag Aplicada Automaticamente</Label>
          <div className="flex items-center gap-2">
            <Badge variant="destructive">
              Urgente
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Esta tag será aplicada automaticamente quando a situação for identificada como urgente
          </p>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sound-enabled" className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                Alarme Sonoro de Urgência
              </Label>
              <p className="text-sm text-muted-foreground">
                Reproduzir som quando um caso urgente for identificado
              </p>
            </div>
            <Switch
              id="sound-enabled"
              checked={urgencySoundEnabled}
              onCheckedChange={onUrgencySoundEnabledChange}
            />
          </div>

          {urgencySoundEnabled && (
            <div className="space-y-3 pl-6">
              <Label>Tipo de Alarme</Label>
              <RadioGroup value={urgencySoundType} onValueChange={onUrgencySoundTypeChange}>
                {soundOptions.map((option) => (
                  <div key={option.value} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                    <div className="flex items-start space-x-3 space-y-0 flex-1">
                      <RadioGroupItem value={option.value} id={option.value} />
                      <div className="space-y-1 leading-none">
                        <Label htmlFor={option.value} className="font-normal cursor-pointer">
                          {option.label}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {option.description}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => playSound(option.value as 'alert1' | 'alert2' | 'alert3')}
                      className="px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      Ouvir
                    </button>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Brain, MessageSquare, Mic, ArrowUpRight } from "lucide-react";

interface AIUsageStatsProps {
  currentTokens: number;
  maxTokens: number;
  usageByType: Record<string, number>;
  audioTranscriptionCount: number;
  onUpgrade: () => void;
}

export const AIUsageStats = ({
  currentTokens,
  maxTokens,
  usageByType,
  audioTranscriptionCount,
  onUpgrade,
}: AIUsageStatsProps) => {
  const usagePercentage = maxTokens > 0 ? (currentTokens / maxTokens) * 100 : 0;
  const remainingTokens = maxTokens - currentTokens;

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  };

  const getProgressColor = () => {
    if (usagePercentage >= 90) return "bg-destructive";
    if (usagePercentage >= 75) return "bg-warning";
    return "bg-primary";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Uso de Tokens IA
            </div>
            {usagePercentage >= 75 && (
              <Button onClick={onUpgrade} size="sm">
                <ArrowUpRight className="h-4 w-4 mr-1" />
                Aumentar Limite
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold">
                {formatTokens(currentTokens)} de {formatTokens(maxTokens)}
              </span>
              <span className="text-muted-foreground">
                {usagePercentage.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={usagePercentage} 
              className="h-3"
            />
            <p className="text-sm text-muted-foreground mt-2">
              {remainingTokens > 0 
                ? `${formatTokens(remainingTokens)} tokens restantes neste mês`
                : "Limite de tokens atingido"}
            </p>
          </div>

          {usagePercentage >= 90 && (
            <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
              ⚠️ Você está próximo do limite mensal de tokens. Considere aumentar seu plano.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tokens em Chat
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatTokens(usageByType.chat || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Conversas com IA no WhatsApp
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Transcrições de Áudio
            </CardTitle>
            <Mic className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {audioTranscriptionCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Áudios transcritos com Whisper
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

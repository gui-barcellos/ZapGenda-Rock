import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Bot } from "lucide-react";
import { VariableEditor } from "@/components/company/VariableEditor";

interface AIPersonalitySectionProps {
  aiName: string;
  greetingMessage: string;
  companyName: string;
  onAINameChange: (value: string) => void;
  onGreetingMessageChange: (value: string) => void;
}

export function AIPersonalitySection({
  aiName,
  greetingMessage,
  companyName,
  onAINameChange,
  onGreetingMessageChange,
}: AIPersonalitySectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Personalidade da IA
        </CardTitle>
        <CardDescription>
          Configure o nome e mensagem de boas-vindas da assistente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="ai-name">Nome da Assistente</Label>
          <Input
            id="ai-name"
            value={aiName}
            onChange={(e) => onAINameChange(e.target.value)}
            placeholder="Ex: Sofia, Ana, Assistente Virtual"
          />
        </div>

        <div className="space-y-4">
          <Label>Mensagem de Boas-Vindas</Label>

          <VariableEditor
            value={greetingMessage}
            onChange={onGreetingMessageChange}
            variables={["{cumprimento}", "{empresa}", "{nome_cliente}", "{nome_assistente}"]}
            placeholder="{cumprimento}, {nome_cliente}! Sou {nome_assistente}, assistente da {empresa}. Como posso ajudar você hoje?"
            rows={3}
            companyName={companyName}
            aiName={aiName}
          />
          <p className="text-sm text-muted-foreground">
            Use as variáveis: {"{cumprimento}"}, {"{empresa}"}, {"{nome_cliente}"}, {"{nome_assistente}"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

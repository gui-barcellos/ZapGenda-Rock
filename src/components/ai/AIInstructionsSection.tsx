import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { FileText } from "lucide-react";

interface AIInstructionsSectionProps {
  aiInstructions: string;
  onAIInstructionsChange: (value: string) => void;
}

export function AIInstructionsSection({
  aiInstructions,
  onAIInstructionsChange,
}: AIInstructionsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Instruções Adicionais
        </CardTitle>
        <CardDescription>
          Regras específicas que a IA deve seguir em todas as conversas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Textarea
          value={aiInstructions}
          onChange={(e) => onAIInstructionsChange(e.target.value)}
          placeholder="Se houver alguma informação que o assistente precisa coletar para realizar o agendamento ou alguma condição diferenciada, insira aqui."
          rows={4}
          className="resize-none"
        />
        <p className="text-sm text-muted-foreground mt-2">
          Se preenchido, estas instruções serão adicionadas ao prompt da IA.
        </p>
      </CardContent>
    </Card>
  );
}

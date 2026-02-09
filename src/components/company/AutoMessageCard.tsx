import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RotateCcw, Loader2 } from "lucide-react";
import { MESSAGE_TYPE_INFO, type AutoMessage } from "@/hooks/useAutoMessages";
import { VariableEditor } from "./VariableEditor";
import { useCompanyData } from "@/hooks/useCompanyData";

interface AutoMessageCardProps {
  messageType: string;
  message: AutoMessage | undefined;
  onUpdate: (data: { is_active: boolean; content: string }) => void;
  onResetToDefault: () => void;
  isResetting?: boolean;
}

export function AutoMessageCard({ messageType, message, onUpdate, onResetToDefault, isResetting }: AutoMessageCardProps) {
  const info = MESSAGE_TYPE_INFO[messageType];
  const { companyData } = useCompanyData();
  const language = companyData?.language || "pt-BR";
  
  const [isActive, setIsActive] = useState(message?.is_active ?? false);
  const [content, setContent] = useState(message?.content ?? info.defaultContent);
  const [hasChanges, setHasChanges] = useState(false);

  // Sincronizar com props quando message mudar
  useEffect(() => {
    setIsActive(message?.is_active ?? false);
    setContent(message?.content ?? info.defaultContent);
    setHasChanges(false);
  }, [message?.id, message?.is_active, message?.content, info.defaultContent]);

  const handleToggleChange = (checked: boolean) => {
    setIsActive(checked);
    
    if (!checked) {
      // DESATIVOU: salvar automaticamente
      onUpdate({ is_active: false, content });
      setHasChanges(false);
      toast.success("Mensagem desativada com sucesso", { duration: 1500 });
    } else {
      // ATIVOU: salvar automaticamente + SEM toast
      onUpdate({ is_active: true, content });
      setHasChanges(false);
    }
  };

  const handleContentChange = (value: string) => {
    setContent(value);
    setHasChanges(true);
  };

  const handleSave = () => {
    onUpdate({ is_active: isActive, content });
    setHasChanges(false);
    toast.success("Mensagem atualizada com sucesso", { duration: 1500 });
  };

  const handleCancel = () => {
    setIsActive(message?.is_active ?? false);
    setContent(message?.content ?? info.defaultContent);
    setHasChanges(false);
  };

  const tokenLabelsByLang: Record<string, Record<string, string>> = {
    "pt-BR": {
      "{{client_name}}": "Nome do cliente",
      "{{company_name}}": "Nome da empresa",
      "{{date}}": "Data",
      "{{weekday}}": "Dia da semana",
      "{{time}}": "Hora",
      "{{professional_name}}": "Profissional",
      "{{service_name}}": "ServiÃ§o",
      "{{company_phone}}": "Telefone da empresa",
    },
    "es": {
      "{{client_name}}": "Nombre del cliente",
      "{{company_name}}": "Nombre de la empresa",
      "{{date}}": "Fecha",
      "{{weekday}}": "DÃ­a de la semana",
      "{{time}}": "Hora",
      "{{professional_name}}": "Profesional",
      "{{service_name}}": "Servicio",
      "{{company_phone}}": "TelÃ©fono de la empresa",
    },
    "en": {
      "{{client_name}}": "Client name",
      "{{company_name}}": "Company name",
      "{{date}}": "Date",
      "{{weekday}}": "Weekday",
      "{{time}}": "Time",
      "{{professional_name}}": "Professional",
      "{{service_name}}": "Service",
      "{{company_phone}}": "Company phone",
    },
  };

  const variableLabels = tokenLabelsByLang[language] || tokenLabelsByLang["pt-BR"];
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg">{info.title}</CardTitle>
            <CardDescription className="mt-1">{info.description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetToDefault}
              disabled={isResetting}
              title="Restaurar mensagem padrão"
            >
              {isResetting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
            </Button>
            <Switch
              checked={isActive}
              onCheckedChange={handleToggleChange}
            />
          </div>
        </div>
      </CardHeader>
      
      {isActive && (
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`content-${messageType}`}>Conteúdo da mensagem</Label>
            <VariableEditor
              value={content}
              onChange={handleContentChange}
              variables={info.variables}
              variableLabels={variableLabels}
              rows={4}
              companyName={companyData?.name}
            />
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button 
              variant="outline" 
              onClick={handleCancel}
              disabled={!hasChanges}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!hasChanges}
            >
              Salvar
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

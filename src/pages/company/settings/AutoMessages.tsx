import { useEffect, useState } from "react";
import CompanyLayout from "@/components/layout/CompanyLayout";
import { useAutoMessages, MESSAGE_TYPES, MESSAGE_TYPE_INFO, type AutoMessage } from "@/hooks/useAutoMessages";
import { useCompanyData } from "@/hooks/useCompanyData";
import { AutoMessageCard } from "@/components/company/AutoMessageCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

const AutoMessages = () => {
  const { messages, isLoading, createMessage, updateMessage, initializeMessages, resetMessagesToDefault } = useAutoMessages();
  const { companyData, updateCompanyData } = useCompanyData();
  const [confirmationHours, setConfirmationHours] = useState(72);
  const [reminderHours, setReminderHours] = useState(24);

  // Inicializar tipos predefinidos na primeira carga
  useEffect(() => {
    if (!isLoading && messages && messages.length === 0 && !initializeMessages.isPending) {
      initializeMessages.mutate();
    }
  }, [isLoading, messages.length]);

  useEffect(() => {
    if (companyData) {
      setConfirmationHours(companyData.confirmation_hours ?? 72);
      setReminderHours(companyData.reminder_hours ?? 24);
    }
  }, [companyData?.confirmation_hours, companyData?.reminder_hours]);

  const getMessageByType = (type: string) => {
    return messages.find(m => m.message_type === type);
  };

  const handleUpdate = (messageType: string, data: { is_active: boolean; content: string }) => {
    const existingMessage = getMessageByType(messageType);
    if (existingMessage) {
      updateMessage.mutate({ 
        ...existingMessage, 
        is_active: data.is_active,
        content: data.content 
      });
    } else {
      createMessage.mutate({
        message_type: messageType,
        content: data.content,
        is_active: data.is_active,
      });
    }
  };

  return (
    <CompanyLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mensagens Automáticas</h1>
          <p className="text-muted-foreground mt-2">
            Todas as mensagens configuradas nesta janela serão enviadas automaticamente aos clientes.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-lg font-semibold">Configuração de Envios</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="confirmation-hours">Confirmação (horas antes)</Label>
                <Input
                  id="confirmation-hours"
                  type="number"
                  min={1}
                  value={confirmationHours}
                  onChange={(e) => setConfirmationHours(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reminder-hours">Lembrete (horas antes)</Label>
                <Input
                  id="reminder-hours"
                  type="number"
                  min={1}
                  value={reminderHours}
                  onChange={(e) => setReminderHours(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() =>
                  updateCompanyData.mutate({
                    confirmation_hours: confirmationHours,
                    reminder_hours: reminderHours,
                  })
                }
              >
                Salvar Configurações
              </Button>
            </div>
          </CardContent>
        </Card>

        {isLoading || initializeMessages.isPending ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {initializeMessages.isPending 
                ? 'Inicializando mensagens automáticas...' 
                : 'Carregando mensagens...'}
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">
              Nenhuma mensagem configurada ainda.
            </p>
            <Button 
              onClick={() => initializeMessages.mutate()}
              disabled={initializeMessages.isPending}
            >
              {initializeMessages.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Inicializando...
                </>
              ) : (
                'Criar Mensagens Padrão'
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.values(MESSAGE_TYPES).map((type) => (
              <AutoMessageCard
                key={type}
                messageType={type}
                message={getMessageByType(type)}
                onUpdate={(data) => handleUpdate(type, data)}
                onResetToDefault={() => resetMessagesToDefault.mutate(type)}
                isResetting={resetMessagesToDefault.isPending}
              />
            ))}
          </div>
        )}
      </div>
    </CompanyLayout>
  );
};

export default AutoMessages;

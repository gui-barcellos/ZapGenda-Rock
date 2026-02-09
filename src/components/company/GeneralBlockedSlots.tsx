import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useAvailability } from "@/hooks/useAvailability";
import { format, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Trash2, AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

export function GeneralBlockedSlots() {
  const { generalBlockedSlots, createGeneralBlockedSlot, deleteBlockedSlot, syncGeneralBlocks } = useAvailability();
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [reason, setReason] = useState("");
  const [selectedBlocks, setSelectedBlocks] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Helper function for calendar
  const isDateBlocked = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return generalBlockedSlots?.some(block => block.date === dateStr) || false;
  };

  const blockedDates = generalBlockedSlots?.map(b => new Date(b.date + "T00:00:00")) || [];

  const handleAddBlock = async () => {
    if (!startDate) {
      toast.error("Selecione uma data de início");
      return;
    }

    const finalEndDate = endDate || startDate;
    
    if (finalEndDate < startDate) {
      toast.error("Data fim não pode ser anterior à data início");
      return;
    }

    const dates = eachDayOfInterval({
      start: startDate,
      end: finalEndDate
    }).map(date => format(date, "yyyy-MM-dd"));

    try {
      // Gerar groupId UMA ÚNICA VEZ
      const groupId = crypto.randomUUID();
      
      // Chamar mutation UMA ÚNICA VEZ com todas as datas
      await createGeneralBlockedSlot.mutateAsync({
        dates,
        reason: reason || undefined,
        groupId,
      });
      
      const totalDays = dates.length;
      toast.success(`${totalDays} ${totalDays === 1 ? 'dia bloqueado' : 'dias bloqueados'} para todos os profissionais`);
      
      setStartDate(undefined);
      setEndDate(undefined);
      setReason("");
    } catch (error) {
      // Erro já tratado pela mutation
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bloqueio Geral</CardTitle>
          <CardDescription>
            Bloqueie TODAS as agendas de profissionais em datas específicas (feriados, férias coletivas, etc.)
            <br />
            <strong>Importante:</strong> Profissionais cadastrados futuramente também receberão estes bloqueios automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Bloqueios gerais impedem agendamentos de todos os profissionais e serviços
            </AlertDescription>
          </Alert>

          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => {
                    setStartDate(date);
                    if (date && !endDate) {
                      setEndDate(date);
                    }
                  }}
                  locale={ptBR}
                  className="rounded-md border"
                  disabled={(date) => 
                    date < new Date(new Date().setHours(0, 0, 0, 0)) ||
                    isDateBlocked(date)
                  }
                  modifiers={{
                    blocked: blockedDates,
                  }}
                  modifiersClassNames={{
                    blocked: "bg-red-200 text-red-700 line-through font-bold",
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  locale={ptBR}
                  className="rounded-md border"
                  disabled={(date) => 
                    !startDate || 
                    date < startDate || 
                    date < new Date(new Date().setHours(0, 0, 0, 0)) ||
                    isDateBlocked(date)
                  }
                  modifiers={{
                    blocked: blockedDates,
                  }}
                  modifiersClassNames={{
                    blocked: "bg-red-200 text-red-700 line-through font-bold",
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <div className="w-3 h-3 bg-red-200 rounded" />
              <span>Data já bloqueada</span>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Motivo (opcional)</Label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex: Natal, Ano Novo, Reforma..."
                />
              </div>

              {startDate && endDate && (
                <p className="text-sm text-muted-foreground">
                  Período: {format(startDate, "dd/MM/yyyy")} até {format(endDate, "dd/MM/yyyy")} 
                  ({eachDayOfInterval({ start: startDate, end: endDate }).length} dias)
                </p>
              )}

              <Button
                onClick={handleAddBlock}
                disabled={!startDate || createGeneralBlockedSlot.isPending}
                className="w-full"
              >
                {createGeneralBlockedSlot.isPending ? "Adicionando..." : "Adicionar Bloqueio Geral"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {generalBlockedSlots && generalBlockedSlots.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Bloqueios Gerais Agendados</CardTitle>
                <CardDescription>
                  Bloqueios aplicados a todos os profissionais
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => syncGeneralBlocks.mutate()}
                  disabled={syncGeneralBlocks.isPending}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${syncGeneralBlocks.isPending ? 'animate-spin' : ''}`} />
                  {syncGeneralBlocks.isPending ? 'Sincronizando...' : 'Sincronizar'}
                </Button>
                {selectedBlocks.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir {selectedBlocks.length} {selectedBlocks.length === 1 ? 'bloqueio' : 'bloqueios'}
                  </Button>
                )}
              </div>
            </div>
        </CardHeader>
        <CardContent>
          {/* Checkbox Selecionar Todas */}
          <div className="flex items-center gap-2 pb-3 mb-3 border-b">
            <Checkbox
              checked={
                generalBlockedSlots?.length > 0 &&
                selectedBlocks.length === generalBlockedSlots.length
              }
              onCheckedChange={(checked) => {
                if (checked) {
                  setSelectedBlocks(generalBlockedSlots?.map(b => b.id) || []);
                } else {
                  setSelectedBlocks([]);
                }
              }}
            />
            <Label className="text-sm font-medium cursor-pointer">
              Selecionar todas ({generalBlockedSlots?.length || 0} {generalBlockedSlots?.length === 1 ? 'data' : 'datas'})
            </Label>
          </div>

          <div className="space-y-2">
            {generalBlockedSlots.map((block) => (
                <div
                  key={block.id}
                  className="flex items-center gap-3 p-3 border rounded-lg bg-red-50 border-red-200"
                >
                  <Checkbox
                    checked={selectedBlocks.includes(block.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedBlocks([...selectedBlocks, block.id]);
                      } else {
                        setSelectedBlocks(selectedBlocks.filter(id => id !== block.id));
                      }
                    }}
                  />
                  <div className="flex-1">
                    <p className="font-medium">
                      {format(new Date(block.date + "T00:00:00"), "dd 'de' MMMM 'de' yyyy", {
                        locale: ptBR,
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {block.reason || "Sem motivo especificado"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>

          <DeleteConfirmDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
            onConfirm={async () => {
              for (const id of selectedBlocks) {
                await deleteBlockedSlot.mutateAsync(id);
              }
              setSelectedBlocks([]);
              setShowDeleteDialog(false);
            }}
            title="Excluir bloqueios gerais selecionados?"
            description={`Tem certeza que deseja excluir ${selectedBlocks.length} ${selectedBlocks.length === 1 ? 'bloqueio geral' : 'bloqueios gerais'}? Isso removerá o bloqueio de TODOS os profissionais. Esta ação não pode ser desfeita.`}
            isLoading={deleteBlockedSlot.isPending}
          />
        </Card>
      )}
    </div>
  );
}

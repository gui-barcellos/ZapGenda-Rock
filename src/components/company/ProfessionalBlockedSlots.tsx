import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useAvailability } from "@/hooks/useAvailability";
import { useProfessionals } from "@/hooks/useProfessionals";
import { format, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export function ProfessionalBlockedSlots() {
  const { professionals } = useProfessionals();
  const [selectedProfessional, setSelectedProfessional] = useState<string>("");
  const { blockedSlots, createBlockedSlot, deleteBlockedSlot, generalBlockedSlots } = useAvailability(selectedProfessional);

  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [reason, setReason] = useState("");
  const [selectedBlocks, setSelectedBlocks] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Helper functions for calendar
  const isDateBlocked = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return blockedSlots?.some(block => block.date === dateStr) || false;
  };

  const professionalBlockedDates = blockedSlots
    ?.filter(b => !b.is_general_block)
    .map(b => new Date(b.date + "T00:00:00")) || [];

  const generalBlockedDates = blockedSlots
    ?.filter(b => b.is_general_block)
    .map(b => new Date(b.date + "T00:00:00")) || [];

  const handleAddBlock = async () => {
    if (!selectedProfessional || !startDate) {
      toast.error("Selecione um profissional e uma data de início");
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
      for (const date of dates) {
        await createBlockedSlot.mutateAsync({
          professionalId: selectedProfessional,
          date,
          reason: reason || undefined,
        });
      }
      
      const totalDays = dates.length;
      toast.success(`${totalDays} ${totalDays === 1 ? 'dia bloqueado' : 'dias bloqueados'}`);
      
      setStartDate(undefined);
      setEndDate(undefined);
      setReason("");
    } catch (error) {
      // Erro já tratado pela mutation
    }
  };

  if (!professionals || professionals.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Cadastre profissionais antes de configurar bloqueios
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bloqueio de Profissional</CardTitle>
          <CardDescription>
            Bloqueie a agenda de um profissional específico (férias, consultas médicas, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Profissional</Label>
            <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um profissional" />
              </SelectTrigger>
              <SelectContent>
                {professionals.map((prof) => (
                  <SelectItem key={prof.id} value={prof.id}>
                    {prof.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProfessional && (
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
                      (selectedProfessional && isDateBlocked(date))
                    }
                    modifiers={{
                      professionalBlocked: professionalBlockedDates,
                      generalBlocked: generalBlockedDates,
                    }}
                    modifiersClassNames={{
                      professionalBlocked: "bg-gray-200 text-gray-500 line-through",
                      generalBlocked: "bg-red-200 text-red-700 line-through font-bold",
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
                      (selectedProfessional && isDateBlocked(date))
                    }
                    modifiers={{
                      professionalBlocked: professionalBlockedDates,
                      generalBlocked: generalBlockedDates,
                    }}
                    modifiersClassNames={{
                      professionalBlocked: "bg-gray-200 text-gray-500 line-through",
                      generalBlocked: "bg-red-200 text-red-700 line-through font-bold",
                    }}
                  />
                </div>
              </div>

              {selectedProfessional && (
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-gray-200 rounded" />
                    <span>Bloqueio do profissional</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-200 rounded" />
                    <span>Bloqueio geral</span>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Motivo (opcional)</Label>
                  <Input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ex: Férias, Feriado, etc."
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
                  disabled={!startDate || createBlockedSlot.isPending}
                  className="w-full"
                >
                  {createBlockedSlot.isPending ? "Adicionando..." : "Adicionar Bloqueio"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedProfessional && blockedSlots && blockedSlots.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Bloqueios Agendados</CardTitle>
                <CardDescription>
                  Bloqueios de {professionals.find(p => p.id === selectedProfessional)?.name}
                </CardDescription>
              </div>
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
        </CardHeader>
        <CardContent>
          {/* Checkbox Selecionar Todas */}
          <div className="flex items-center gap-2 pb-3 mb-3 border-b">
            <Checkbox
              checked={
                blockedSlots?.length > 0 &&
                selectedBlocks.length === blockedSlots.filter(b => !b.is_general_block).length &&
                blockedSlots.some(b => !b.is_general_block)
              }
              onCheckedChange={(checked) => {
                if (checked) {
                  setSelectedBlocks(blockedSlots?.filter(b => !b.is_general_block).map(b => b.id) || []);
                } else {
                  setSelectedBlocks([]);
                }
              }}
              disabled={!blockedSlots?.some(b => !b.is_general_block)}
            />
            <Label className={`text-sm font-medium cursor-pointer ${!blockedSlots?.some(b => !b.is_general_block) ? 'text-muted-foreground' : ''}`}>
              Selecionar todas (
              {blockedSlots?.filter(b => !b.is_general_block).length || 0} {blockedSlots?.filter(b => !b.is_general_block).length === 1 ? 'data' : 'datas'}
              )
            </Label>
          </div>

          <div className="space-y-2">
            {blockedSlots.map((block) => (
                <div
                  key={block.id}
                  className={`flex items-center gap-3 p-3 border rounded-lg ${
                    block.is_general_block ? 'bg-red-50 border-red-200' : ''
                  }`}
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
                    disabled={block.is_general_block}
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
                    {block.is_general_block && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        🌐 <strong>Bloqueio Geral</strong> (gerenciado na aba Bloqueio Geral)
                      </p>
                    )}
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
            title="Excluir bloqueios selecionados?"
            description={`Tem certeza que deseja excluir ${selectedBlocks.length} ${selectedBlocks.length === 1 ? 'bloqueio' : 'bloqueios'}? Esta ação não pode ser desfeita.`}
            isLoading={deleteBlockedSlot.isPending}
          />
        </Card>
      )}
    </div>
  );
}

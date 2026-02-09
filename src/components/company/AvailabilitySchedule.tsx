import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useAvailability } from "@/hooks/useAvailability";
import { useProfessionals } from "@/hooks/useProfessionals";
import { toast } from "sonner";

const DAYS = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda-feira" },
  { value: 2, label: "Terça-feira" },
  { value: 3, label: "Quarta-feira" },
  { value: 4, label: "Quinta-feira" },
  { value: 5, label: "Sexta-feira" },
  { value: 6, label: "Sábado" },
];

interface DaySchedule {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export function AvailabilitySchedule() {
  const { professionals } = useProfessionals();
  const [selectedProfessional, setSelectedProfessional] = useState<string>("");
  const { availability, isLoading, bulkUpdateAvailability } = useAvailability(selectedProfessional);

  const [schedules, setSchedules] = useState<DaySchedule[]>(
    DAYS.map((day) => ({
      day_of_week: day.value,
      start_time: "09:00",
      end_time: "18:00",
      is_active: false,
    }))
  );

  useEffect(() => {
    if (availability && availability.length > 0) {
      const updatedSchedules = DAYS.map((day) => {
        const existing = availability.find((a) => a.day_of_week === day.value);
        return (
          existing || {
            day_of_week: day.value,
            start_time: "09:00",
            end_time: "18:00",
            is_active: false,
          }
        );
      });
      setSchedules(updatedSchedules);
    }
  }, [availability]);

  const handleToggleDay = (dayOfWeek: number, checked: boolean) => {
    setSchedules((prev) =>
      prev.map((schedule) =>
        schedule.day_of_week === dayOfWeek ? { ...schedule, is_active: checked } : schedule
      )
    );
  };

  const handleTimeChange = (dayOfWeek: number, field: "start_time" | "end_time", value: string) => {
    setSchedules((prev) =>
      prev.map((schedule) =>
        schedule.day_of_week === dayOfWeek ? { ...schedule, [field]: value } : schedule
      )
    );
  };

  const handleCopyToAll = () => {
    const firstActiveDay = schedules.find((s) => s.is_active);
    if (!firstActiveDay) {
      toast.error("Ative pelo menos um dia para copiar");
      return;
    }

    setSchedules((prev) =>
      prev.map((schedule) => ({
        ...schedule,
        start_time: firstActiveDay.start_time,
        end_time: firstActiveDay.end_time,
      }))
    );
    toast.success("Horários copiados para todos os dias");
  };

  const handleSave = async () => {
    if (!selectedProfessional) {
      toast.error("Selecione um profissional");
      return;
    }

    await bulkUpdateAvailability.mutateAsync({
      professionalId: selectedProfessional,
      schedules,
    });

    setSelectedProfessional("");
  };

  const handleCancel = () => {
    setSelectedProfessional("");
  };

  if (!professionals || professionals.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Cadastre profissionais antes de configurar a disponibilidade
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Horários de Trabalho</CardTitle>
        <CardDescription>Configure os horários de disponibilidade do profissional</CardDescription>
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
          <>
            <div className="space-y-2">
              {DAYS.map((day) => {
                const schedule = schedules.find((s) => s.day_of_week === day.value);
                if (!schedule) return null;

                return (
                  <div key={day.value} className="flex items-center gap-4 p-3 border rounded-lg">
                    <div className="flex items-center gap-2 w-40">
                      <Switch
                        checked={schedule.is_active}
                        onCheckedChange={(checked) => handleToggleDay(day.value, checked)}
                      />
                      <Label className="font-medium">{day.label}</Label>
                    </div>

                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        type="time"
                        value={schedule.start_time}
                        onChange={(e) => handleTimeChange(day.value, "start_time", e.target.value)}
                        disabled={!schedule.is_active}
                        className="w-32"
                      />
                      <span className="text-muted-foreground">às</span>
                      <Input
                        type="time"
                        value={schedule.end_time}
                        onChange={(e) => handleTimeChange(day.value, "end_time", e.target.value)}
                        disabled={!schedule.is_active}
                        className="w-32"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

                  <div className="flex justify-between">
                    <Button type="button" variant="outline" onClick={handleCopyToAll}>
                      Copiar para Todos os Dias
                    </Button>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={handleCancel}>
                        Voltar
                      </Button>
                      <Button onClick={handleSave} disabled={bulkUpdateAvailability.isPending || isLoading}>
                        {bulkUpdateAvailability.isPending ? "Salvando..." : "Salvar Horários"}
                      </Button>
                    </div>
                  </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useServiceAvailability } from "@/hooks/useServiceAvailability";
import { useServices } from "@/hooks/useServices";
import { Save } from "lucide-react";

const DAYS_OF_WEEK = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda-feira" },
  { value: 2, label: "Terça-feira" },
  { value: 3, label: "Quarta-feira" },
  { value: 4, label: "Quinta-feira" },
  { value: 5, label: "Sexta-feira" },
  { value: 6, label: "Sábado" },
];

interface Schedule {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export function ServiceAvailabilitySchedule() {
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const { services } = useServices();
  const { serviceAvailability, bulkUpdateServiceAvailability } = useServiceAvailability(selectedServiceId);

  const [schedules, setSchedules] = useState<Schedule[]>(
    DAYS_OF_WEEK.map(day => ({
      day_of_week: day.value,
      start_time: "09:00",
      end_time: "18:00",
      is_active: false,
    }))
  );

  useEffect(() => {
    if (selectedServiceId && serviceAvailability) {
      const newSchedules = DAYS_OF_WEEK.map(day => {
        const existing = serviceAvailability.find(a => a.day_of_week === day.value);
        return existing ? {
          day_of_week: existing.day_of_week,
          start_time: existing.start_time,
          end_time: existing.end_time,
          is_active: existing.is_active,
        } : {
          day_of_week: day.value,
          start_time: "09:00",
          end_time: "18:00",
          is_active: false,
        };
      });
      setSchedules(newSchedules);
    }
  }, [selectedServiceId, serviceAvailability]);

  const handleServiceChange = (serviceId: string) => {
    setSelectedServiceId(serviceId);
  };

  const updateSchedule = (dayIndex: number, field: keyof Schedule, value: any) => {
    const newSchedules = [...schedules];
    newSchedules[dayIndex] = { ...newSchedules[dayIndex], [field]: value };
    setSchedules(newSchedules);
  };

  const handleSave = async () => {
    if (!selectedServiceId) return;

    await bulkUpdateServiceAvailability.mutateAsync({
      serviceId: selectedServiceId,
      schedules,
    });

    setSelectedServiceId("");
  };

  const handleCancel = () => {
    setSelectedServiceId("");
  };

  const activeServices = services?.filter(s => s.is_active) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Disponibilidade do Serviço</CardTitle>
        <CardDescription>
          Configure em quais dias/horários este serviço pode ser agendado
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Selecione o serviço</Label>
          <Select value={selectedServiceId} onValueChange={handleServiceChange}>
            <SelectTrigger>
              <SelectValue placeholder="Escolha um serviço" />
            </SelectTrigger>
            <SelectContent className="bg-card">
              {activeServices.map((service) => (
                <SelectItem key={service.id} value={service.id}>
                  {service.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedServiceId && (
          <>
            <div className="space-y-2">
              {schedules.map((schedule, index) => (
                <div key={schedule.day_of_week} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="flex items-center gap-2 w-40">
                    <Switch
                      checked={schedule.is_active}
                      onCheckedChange={(checked) => updateSchedule(index, "is_active", checked)}
                    />
                    <Label className="text-sm font-medium">
                      {DAYS_OF_WEEK[schedule.day_of_week].label}
                    </Label>
                  </div>

                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="time"
                      value={schedule.start_time}
                      onChange={(e) => updateSchedule(index, "start_time", e.target.value)}
                      disabled={!schedule.is_active}
                      className="w-32"
                    />
                    <span className="text-muted-foreground">às</span>
                    <Input
                      type="time"
                      value={schedule.end_time}
                      onChange={(e) => updateSchedule(index, "end_time", e.target.value)}
                      disabled={!schedule.is_active}
                      className="w-32"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                type="button"
                variant="outline"
                onClick={handleCancel}
              >
                Voltar
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={bulkUpdateServiceAvailability.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {bulkUpdateServiceAvailability.isPending ? "Salvando..." : "Salvar Horários"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

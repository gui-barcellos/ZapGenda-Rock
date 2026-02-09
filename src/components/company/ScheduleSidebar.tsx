import { useState, useMemo } from "react";
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { CalendarIcon, ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { SchedulingTag } from "@/hooks/useSchedulingTags";
import { parseISO } from "date-fns";

interface Professional {
  id: string;
  name: string;
  is_active: boolean;
}

interface Appointment {
  id: string;
  date: string;
  start_time: string;
  contact?: { name: string };
  service?: { name: string };
}

interface ScheduleSidebarProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  selectedProfessionalId: string;
  onProfessionalChange: (id: string) => void;
  professionals: Professional[];
  appointments: Appointment[];
  schedulingTags: SchedulingTag[];
  onCreateAppointment: () => void;
  onAppointmentSelect: (appointment: Appointment) => void;
}

export function ScheduleSidebar({
  selectedDate,
  onDateChange,
  selectedProfessionalId,
  onProfessionalChange,
  professionals,
  appointments,
  schedulingTags,
  onCreateAppointment,
  onAppointmentSelect,
}: ScheduleSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const sortedProfessionals = useMemo(() => {
    return [...professionals]
      .filter(p => p.is_active)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [professionals]);

  const filteredAppointments = useMemo(() => {
    if (!searchQuery) return [];

    const query = searchQuery.toLowerCase();
    return appointments
      .filter(apt =>
        apt.contact?.name.toLowerCase().includes(query) ||
        apt.service?.name.toLowerCase().includes(query)
      )
      .slice(0, 10);
  }, [searchQuery, appointments]);


  return (
    <div className="w-80 bg-card p-4 space-y-4">

      {/* Botão Agendar */}
      <Button
        className="w-full flex-shrink-0"
        size="lg"
        onClick={onCreateAppointment}
      >
        <Plus className="h-5 w-5 mr-2" />
        AGENDAR
      </Button>

      {/* Busca com Dropdown */}
      <div className="relative flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar agendamento"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Dropdown de Resultados */}
        {searchQuery && filteredAppointments.length > 0 && (
          <Card className="absolute z-50 w-full mt-2 max-h-64 overflow-y-auto shadow-lg">
            {filteredAppointments.map((apt) => (
              <div
                key={apt.id}
                className="p-3 hover:bg-muted cursor-pointer border-b last:border-0 transition-colors"
                onClick={() => {
                  setSearchQuery("");
                  onAppointmentSelect(apt);
                }}
              >
                <div className="font-medium">{apt.contact?.name}</div>
                <div className="text-sm text-muted-foreground">
                  {format(parseISO(apt.date), "dd/MM/yyyy", { locale: ptBR })} às {apt.start_time}
                </div>
                <div className="text-xs text-muted-foreground">{apt.service?.name}</div>
              </div>
            ))}
          </Card>
        )}
      </div>

      {/* Calendário Mensal */}
      <div className="flex-shrink-0">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => date && onDateChange(date)}
          locale={ptBR}
          className="rounded-md border"
        />
      </div>

      {/* Seções com scroll */}
      <div className="space-y-4">
        {/* Seleção de Profissional */}
        <div>
          <h3 className="font-semibold mb-3 text-sm">Profissionais</h3>
          <RadioGroup value={selectedProfessionalId} onValueChange={onProfessionalChange}>
            <div className="space-y-2">
              {sortedProfessionals.map((prof) => (
                <div key={prof.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={prof.id} id={prof.id} />
                  <Label htmlFor={prof.id} className="cursor-pointer truncate flex-1 text-sm">
                    {prof.name}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </div>

        {/* Legenda de Status */}
        <div>
          <h3 className="font-semibold mb-3 text-sm">Status dos Agendamentos</h3>
          <div className="space-y-2">
            {schedulingTags.map((tag) => (
              <div key={tag.id} className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="text-sm">{tag.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Info da semana selecionada */}
        <div className="pt-4 border-t border-border">
          <div className="text-xs text-muted-foreground">
            Semana de {format(startOfWeek(selectedDate, { locale: ptBR }), "dd/MM", { locale: ptBR })} até{" "}
            {format(endOfWeek(selectedDate, { locale: ptBR }), "dd/MM", { locale: ptBR })}
          </div>
        </div>
      </div>
    </div>
  );
}

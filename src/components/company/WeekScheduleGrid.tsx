import { useMemo } from "react";
import { format, startOfWeek, addDays, parseISO, parse, isSameDay, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { getAppointmentColor } from "@/lib/appointment-utils";
import { SchedulingTag } from "@/hooks/useSchedulingTags";
import { toast } from "sonner";

interface BusinessHour {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface Appointment {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  contact?: { name: string };
  service?: { name: string; duration: number };
  professional_id: string;
}

interface WeekScheduleGridProps {
  selectedDate: Date;
  selectedProfessionalId: string;
  appointments: Appointment[];
  businessHours: BusinessHour[];
  professionalAvailability: BusinessHour[];
  schedulingTags: SchedulingTag[];
  onAppointmentUpdate: (id: string, newDate: string, newTime: string) => void;
  onSlotClick: (date: Date, time: string) => void;
  onAppointmentClick: (appointment: Appointment) => void;
}

function generateTimeSlots(businessHours: BusinessHour[], professionalAvailability: BusinessHour[]): string[] {
  const slots: string[] = [];
  const allHours = [...businessHours, ...professionalAvailability];
  
  if (allHours.length === 0) {
    // Horário padrão: 07:00 - 19:00
    for (let hour = 7; hour < 19; hour++) {
      slots.push(`${String(hour).padStart(2, '0')}:00`);
      slots.push(`${String(hour).padStart(2, '0')}:30`);
    }
    return slots;
  }

  // Encontrar horário mais cedo e mais tarde
  let earliestStart = 24 * 60;
  let latestEnd = 0;

  allHours.forEach(bh => {
    if (!bh.is_active) return;
    const [startH, startM] = bh.start_time.split(':').map(Number);
    const [endH, endM] = bh.end_time.split(':').map(Number);
    const start = startH * 60 + startM;
    const end = endH * 60 + endM;

    if (start < earliestStart) earliestStart = start;
    if (end > latestEnd) latestEnd = end;
  });

  for (let minutes = earliestStart; minutes < latestEnd; minutes += 30) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    slots.push(`${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`);
  }

  return slots;
}

function isSlotAvailable(
  day: Date, 
  time: string, 
  businessHours: BusinessHour[],
  professionalAvailability: BusinessHour[]
): boolean {
  const dayOfWeek = day.getDay();
  const [slotHour, slotMinute] = time.split(':').map(Number);
  const slotMinutes = slotHour * 60 + slotMinute;

  // 1. Verificar horário de funcionamento da CLÍNICA
  const dayBH = businessHours.filter(
    bh => bh.is_active && bh.day_of_week === dayOfWeek
  );

  if (dayBH.length === 0) return false;

  const isInBusinessHours = dayBH.some(bh => {
    const [startH, startM] = bh.start_time.split(':').map(Number);
    const [endH, endM] = bh.end_time.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    return slotMinutes >= startMinutes && slotMinutes < endMinutes;
  });

  if (!isInBusinessHours) return false;

  // 2. Verificar disponibilidade do PROFISSIONAL
  if (!professionalAvailability || professionalAvailability.length === 0) {
    return true; // Se não há availability cadastrada, usa horário da clínica
  }

  const dayPA = professionalAvailability.filter(
    pa => pa.is_active && pa.day_of_week === dayOfWeek
  );

  if (dayPA.length === 0) return false;

  return dayPA.some(pa => {
    const [startH, startM] = pa.start_time.split(':').map(Number);
    const [endH, endM] = pa.end_time.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    return slotMinutes >= startMinutes && slotMinutes < endMinutes;
  });
}

function AppointmentCard({ appointment, tags }: { appointment: Appointment; tags: SchedulingTag[] }) {
  const color = getAppointmentColor(appointment, tags);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: appointment.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "p-2 rounded-md text-xs cursor-move shadow-sm hover:shadow-md transition-all border-l-4 mb-1",
        isDragging && "opacity-50"
      )}
      style={{
        backgroundColor: `${color}20`,
        borderLeftColor: color,
      }}
    >
      <div className="font-semibold truncate">{appointment.contact?.name}</div>
      <div className="text-muted-foreground truncate text-[10px]">{appointment.service?.name}</div>
    </div>
  );
}

function DroppableSlot({
  day,
  time,
  rowIndex,
  appointments,
  tags,
  onClick,
  onAppointmentClick,
  isTodayColumn,
}: {
  day: Date;
  time: string;
  rowIndex: number;
  appointments: Appointment[];
  tags: SchedulingTag[];
  onClick: () => void;
  onAppointmentClick: (apt: Appointment) => void;
  isTodayColumn?: boolean;
}) {
  const droppableId = `${format(day, "yyyy-MM-dd")}_${time}`;
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "p-1 border-r border-b border-border h-[60px] cursor-pointer transition-colors",
        isTodayColumn && "bg-primary/5",
        rowIndex % 2 === 0 ? "bg-muted/40" : "bg-muted/20",
        isOver && "bg-primary/10 ring-2 ring-primary ring-inset"
      )}
      onClick={onClick}
    >
      {appointments.map((apt) => (
        <div key={apt.id} onClick={(e) => {
          e.stopPropagation();
          onAppointmentClick(apt);
        }}>
          <AppointmentCard appointment={apt} tags={tags} />
        </div>
      ))}
    </div>
  );
}

export function WeekScheduleGrid({
  selectedDate,
  selectedProfessionalId,
  appointments,
  businessHours,
  professionalAvailability,
  schedulingTags,
  onAppointmentUpdate,
  onSlotClick,
  onAppointmentClick,
}: WeekScheduleGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const weekStart = startOfWeek(selectedDate, { locale: ptBR });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const timeSlots = useMemo(() => generateTimeSlots(businessHours, professionalAvailability), [businessHours, professionalAvailability]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter(apt => apt.professional_id === selectedProfessionalId);
  }, [appointments, selectedProfessionalId]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const appointmentId = active.id as string;
    const [newDate, newTime] = (over.id as string).split('_');

    // Validar se está dentro do business hours
    const targetDay = parseISO(newDate);
    if (!isSlotAvailable(targetDay, newTime, businessHours, professionalAvailability)) {
      toast.error("Não é possível agendar fora do horário de funcionamento");
      return;
    }

    onAppointmentUpdate(appointmentId, newDate, newTime);
  };

  const getAppointmentsForSlot = (day: Date, time: string) => {
    return filteredAppointments.filter(apt => {
      const aptDate = parseISO(apt.date);
      // Normalizar ambos os horários para HH:MM (sem segundos)
      const aptTime = apt.start_time.substring(0, 5);
      return isSameDay(aptDate, day) && aptTime === time;
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToWindowEdges]}
    >
      <div className="border border-border rounded-lg bg-card">
        <div className="grid grid-cols-8 gap-0">
          {/* Header Row */}
          <div className="col-span-1 p-3 bg-muted/50 font-semibold border-b border-r border-border sticky top-0 z-10">
            Horário
          </div>
          {weekDays.map((day) => {
            const isTodayColumn = isToday(day);
            
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "p-3 font-semibold text-center border-b border-border sticky top-0 z-10",
                  isTodayColumn ? "bg-primary/20" : "bg-muted/50"
                )}
              >
                <div className="text-sm">{format(day, "EEE", { locale: ptBR })}</div>
                <div className={cn(
                  "text-xs",
                  isTodayColumn ? "text-primary font-bold" : "text-muted-foreground"
                )}>
                  {format(day, "dd/MM")}
                </div>
              </div>
            );
          })}

          {/* Time Slots */}
          {timeSlots.map((time, rowIndex) => (
            <div key={time} className="contents">
              <div
                className={cn(
                  "p-2 text-sm font-medium border-r border-b border-border flex items-center justify-center",
                  rowIndex % 2 === 0 ? "bg-muted/40" : "bg-muted/20"
                )}
              >
                {time}
              </div>
              {weekDays.map((day) => {
                const isAvailable = isSlotAvailable(day, time, businessHours, professionalAvailability);
                const isTodayColumn = isToday(day);
                
                if (!isAvailable) {
                  return (
                    <div
                      key={`${day.toISOString()}-${time}`}
                      className="border-r border-b border-border unavailable-slot"
                    />
                  );
                }

                const slotAppointments = getAppointmentsForSlot(day, time);

                return (
                  <DroppableSlot
                    key={`${day.toISOString()}-${time}`}
                    day={day}
                    time={time}
                    rowIndex={rowIndex}
                    appointments={slotAppointments}
                    tags={schedulingTags}
                    onClick={() => onSlotClick(day, time)}
                    onAppointmentClick={onAppointmentClick}
                    isTodayColumn={isTodayColumn}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </DndContext>
  );
}

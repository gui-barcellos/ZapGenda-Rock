import { Calendar, dateFnsLocalizer, Event } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useMemo } from "react";

const locales = {
  "pt-BR": ptBR,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface ScheduleCalendarProps {
  appointments: any[];
  onEventClick: (event: any) => void;
  onSlotSelect: (slot: { start: Date; end: Date }) => void;
  onEventDrop?: (event: any, start: Date, end: Date) => void;
}

const statusColors: Record<string, string> = {
  scheduled: "#3b82f6",
  confirmed: "#10b981",
  completed: "#6b7280",
  cancelled: "#ef4444",
  no_show: "#f97316",
};

export default function ScheduleCalendar({
  appointments,
  onEventClick,
  onSlotSelect,
  onEventDrop,
}: ScheduleCalendarProps) {
  const events: Event[] = useMemo(() => {
    return appointments.map((apt) => {
      const [startHours, startMinutes] = apt.start_time.split(":").map(Number);
      const [endHours, endMinutes] = apt.end_time.split(":").map(Number);

      const start = new Date(apt.date);
      start.setHours(startHours, startMinutes, 0);

      const end = new Date(apt.date);
      end.setHours(endHours, endMinutes, 0);

      return {
        id: apt.id,
        title: `${apt.contact?.name} - ${apt.service?.name}`,
        start,
        end,
        resource: {
          ...apt,
          color: statusColors[apt.status] || apt.professional?.color || apt.service?.color,
        },
      };
    });
  }, [appointments]);

  const eventStyleGetter = (event: Event) => {
    const backgroundColor = event.resource?.color || "#3b82f6";
    return {
      style: {
        backgroundColor,
        borderRadius: "4px",
        opacity: 0.9,
        color: "white",
        border: "none",
        display: "block",
      },
    };
  };

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    onSlotSelect({ start, end });
  };

  const handleSelectEvent = (event: Event) => {
    onEventClick(event.resource);
  };

  const handleEventDrop = ({ event, start, end }: any) => {
    if (onEventDrop) {
      onEventDrop(event.resource, start, end);
    }
  };

  return (
    <div className="h-[calc(100vh-20rem)]">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: "100%" }}
        eventPropGetter={eventStyleGetter}
        onSelectEvent={handleSelectEvent}
        onSelectSlot={handleSelectSlot}
        onEventDrop={handleEventDrop}
        selectable
        resizable
        views={["month", "week", "day"]}
        defaultView="week"
        step={30}
        showMultiDayTimes
        messages={{
          next: "Próximo",
          previous: "Anterior",
          today: "Hoje",
          month: "Mês",
          week: "Semana",
          day: "Dia",
          agenda: "Agenda",
          date: "Data",
          time: "Hora",
          event: "Evento",
          noEventsInRange: "Não há agendamentos neste período.",
          showMore: (total) => `+ ${total} mais`,
        }}
        culture="pt-BR"
      />
    </div>
  );
}

import { useEffect } from "react";
import { Label } from "@/components/ui/label";
import { TimePickerDropdown } from "./TimePickerDropdown";
interface TimeRangeInputProps {
  startTime: string;
  endTime: string;
  duration?: number; // em minutos
  businessHours?: {
    opening_time: string;
    closing_time: string;
  };
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
}
export function TimeRangeInput({
  startTime,
  endTime,
  duration = 30,
  businessHours = {
    opening_time: "08:00",
    closing_time: "18:00"
  },
  onStartTimeChange,
  onEndTimeChange
}: TimeRangeInputProps) {
  // Calcula horário fim automaticamente
  useEffect(() => {
    if (startTime && duration) {
      const [hours, minutes] = startTime.split(":").map(Number);
      const totalMinutes = hours * 60 + minutes + duration;
      const endHours = Math.floor(totalMinutes / 60);
      const endMinutes = totalMinutes % 60;
      const calculatedEndTime = `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
      onEndTimeChange(calculatedEndTime);
    }
  }, [startTime, duration, onEndTimeChange]);
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="start-time">Horário Início</Label>
        <TimePickerDropdown
          value={startTime}
          onChange={onStartTimeChange}
          minTime={businessHours.opening_time}
          maxTime={businessHours.closing_time}
          step={10}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="end-time">Horário Fim</Label>
        <TimePickerDropdown
          value={endTime}
          onChange={() => {}}
          disabled
        />
        <p className="text-xs text-muted-foreground">
          Calculado automaticamente
        </p>
      </div>
    </div>
  );
}
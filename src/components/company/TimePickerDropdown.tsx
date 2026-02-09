import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock } from "lucide-react";

interface TimePickerDropdownProps {
  value: string; // formato "HH:MM"
  onChange: (time: string) => void;
  minTime?: string;
  maxTime?: string;
  step?: number; // minutos (default: 15)
  disabled?: boolean;
}

export function TimePickerDropdown({
  value,
  onChange,
  minTime = "00:00",
  maxTime = "23:45",
  step = 15,
  disabled = false
}: TimePickerDropdownProps) {
  const parseTime = (timeValue: string): [number, number] => {
    if (!timeValue || !timeValue.includes(":")) {
      return [0, 0];
    }
    const [h, m] = timeValue.split(":").map(Number);
    return [isNaN(h) ? 0 : h, isNaN(m) ? 0 : m];
  };

  const [hours, minutes] = parseTime(value);
  
  // Parse min/max times
  const [minHour, minMinute] = minTime.split(":").map(Number);
  const [maxHour, maxMinute] = maxTime.split(":").map(Number);

  // Generate hour options
  const hourOptions: number[] = [];
  for (let h = minHour; h <= maxHour; h++) {
    hourOptions.push(h);
  }

  // Generate minute options based on step
  const minuteOptions: number[] = [];
  for (let m = 0; m < 60; m += step) {
    minuteOptions.push(m);
  }

  const handleHourChange = (newHour: string) => {
    const h = parseInt(newHour);
    let m = minutes;
    
    // Adjust minutes if hour is at boundary
    if (h === minHour && m < minMinute) {
      m = minMinute;
    }
    if (h === maxHour && m > maxMinute) {
      m = maxMinute;
    }
    
    onChange(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  };

  const handleMinuteChange = (newMinute: string) => {
    const m = parseInt(newMinute);
    onChange(`${String(hours).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  };

  // Filter minute options based on current hour
  const filteredMinuteOptions = minuteOptions.filter((m) => {
    if (hours === minHour && m < minMinute) return false;
    if (hours === maxHour && m > maxMinute) return false;
    return true;
  });

  return (
    <div className="flex items-center gap-2">
      <Clock className="h-4 w-4 text-muted-foreground" />
      <Select
        value={String(hours)}
        onValueChange={handleHourChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-20">
          <SelectValue>{String(hours).padStart(2, "0")}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {hourOptions.map((h) => (
            <SelectItem key={h} value={String(h)}>
              {String(h).padStart(2, "0")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground font-medium">:</span>
      <Select
        value={String(minutes)}
        onValueChange={handleMinuteChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-20">
          <SelectValue>{String(minutes).padStart(2, "0")}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {filteredMinuteOptions.map((m) => (
            <SelectItem key={m} value={String(m)}>
              {String(m).padStart(2, "0")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

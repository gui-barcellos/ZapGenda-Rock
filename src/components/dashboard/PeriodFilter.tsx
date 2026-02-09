import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "lucide-react";

export type PeriodOption = '7days' | '30days' | 'currentMonth' | 'lastMonth' | '3months' | '6months' | 'currentYear';

interface PeriodFilterProps {
  value: PeriodOption;
  onChange: (value: PeriodOption) => void;
}

export const PeriodFilter = ({ value, onChange }: PeriodFilterProps) => {
  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Selecione o período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7days">Últimos 7 dias</SelectItem>
          <SelectItem value="30days">Últimos 30 dias</SelectItem>
          <SelectItem value="currentMonth">Mês atual</SelectItem>
          <SelectItem value="lastMonth">Mês anterior</SelectItem>
          <SelectItem value="3months">Últimos 3 meses</SelectItem>
          <SelectItem value="6months">Últimos 6 meses</SelectItem>
          <SelectItem value="currentYear">Ano atual</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

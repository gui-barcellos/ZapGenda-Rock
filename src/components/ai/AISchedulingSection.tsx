import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "lucide-react";

interface AISchedulingSectionProps {
  showNextSlots: number;
  onShowNextSlotsChange: (value: number) => void;
}

export function AISchedulingSection({
  showNextSlots,
  onShowNextSlotsChange,
}: AISchedulingSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Configurações de Agendamento
        </CardTitle>
        <CardDescription>
          Configure como a IA deve lidar com agendamentos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="show-next-slots">Quantidade de Horários a Mostrar</Label>
          <Select
            value={showNextSlots.toString()}
            onValueChange={(value) => onShowNextSlotsChange(parseInt(value))}
          >
            <SelectTrigger id="show-next-slots">
              <SelectValue placeholder="Selecione a quantidade" />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <SelectItem key={num} value={num.toString()}>
                  {num} {num === 1 ? 'horário' : 'horários'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Quantos horários disponíveis a IA deve apresentar ao cliente
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

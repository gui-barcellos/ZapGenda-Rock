import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Filter, Search } from "lucide-react";
import { useState } from "react";
import { CRMFilters as CRMFiltersType } from "@/hooks/useCRM";
import { useCompanyUsers } from "@/hooks/useCompanyUsers";
import { useCRMStages } from "@/hooks/useCRMStages";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface CRMFiltersProps {
  onFilterChange: (filters: CRMFiltersType) => void;
}

export const CRMFilters = ({ onFilterChange }: CRMFiltersProps) => {
  const [search, setSearch] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [stage, setStage] = useState<string>("");
  const [minValue, setMinValue] = useState<string>("");
  const [maxValue, setMaxValue] = useState<string>("");

  const { users } = useCompanyUsers();
  const { data: stages } = useCRMStages();

  const applyFilters = () => {
    onFilterChange({
      search: search || undefined,
      assignedTo: assignedTo || undefined,
      stage: stage || undefined,
      minValue: minValue ? parseFloat(minValue) : undefined,
      maxValue: maxValue ? parseFloat(maxValue) : undefined,
    });
  };

  const clearFilters = () => {
    setSearch("");
    setAssignedTo("");
    setStage("");
    setMinValue("");
    setMaxValue("");
    onFilterChange({});
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar contato..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            onFilterChange({
              search: e.target.value || undefined,
              assignedTo: assignedTo || undefined,
              stage: stage || undefined,
              minValue: minValue ? parseFloat(minValue) : undefined,
              maxValue: maxValue ? parseFloat(maxValue) : undefined,
            });
          }}
          className="pl-10"
        />
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <h4 className="font-semibold">Filtros</h4>

            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {(users ?? []).map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Estágio</Label>
              <Select value={stage} onValueChange={setStage}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {stages?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Valor Estimado</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Mín"
                  value={minValue}
                  onChange={(e) => setMinValue(e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Máx"
                  value={maxValue}
                  onChange={(e) => setMaxValue(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={applyFilters} className="flex-1">
                Aplicar
              </Button>
              <Button onClick={clearFilters} variant="outline" className="flex-1">
                Limpar
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

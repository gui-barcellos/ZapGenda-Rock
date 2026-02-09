import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface ConversationFiltersProps {
  activeFilter: 'all' | 'unread' | 'favorites';
  onFilterChange: (filter: 'all' | 'unread' | 'favorites') => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

export const ConversationFilters = ({
  activeFilter,
  onFilterChange,
  searchTerm,
  onSearchChange,
}: ConversationFiltersProps) => {
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou telefone..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs value={activeFilter} onValueChange={onFilterChange}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="unread">Não Lidas</TabsTrigger>
          <TabsTrigger value="favorites">Favoritas</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};

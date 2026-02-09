import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, MoreVertical, Users, UserCog, Phone, Contact, AlertTriangle, History, Edit } from "lucide-react";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { EditLimitsDialog } from "./EditLimitsDialog";
import { SubscriptionHistoryDialog } from "./SubscriptionHistoryDialog";

export const ActivePlansTab = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  const { data: subscriptions, isLoading } = useSubscriptions({
    search,
    status: statusFilter,
  });

  const getUsageIcon = (type: string) => {
    switch (type) {
      case 'users': return <Users className="h-4 w-4" />;
      case 'professionals': return <UserCog className="h-4 w-4" />;
      case 'whatsapp': return <Phone className="h-4 w-4" />;
      case 'contacts': return <Contact className="h-4 w-4" />;
      default: return null;
    }
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "text-destructive";
    if (percentage >= 75) return "text-chart-2";
    return "text-accent";
  };

  const handleEditLimits = (companyId: string) => {
    setSelectedCompanyId(companyId);
    setEditDialogOpen(true);
  };

  const handleViewHistory = (companyId: string) => {
    setSelectedCompanyId(companyId);
    setHistoryDialogOpen(true);
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="active">Ativas</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="suspended">Suspensas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Uso de Recursos</TableHead>
              <TableHead className="text-right">Receita Mensal</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscriptions?.map((sub) => (
              <TableRow key={sub.id}>
                <TableCell className="font-medium">
                  {sub.companies?.name}
                </TableCell>
                <TableCell>
                  <Badge variant={
                    sub.companies?.status === 'active' ? 'default' :
                    sub.companies?.status === 'trial' ? 'secondary' : 'destructive'
                  }>
                    {sub.companies?.status === 'active' ? 'Ativa' :
                     sub.companies?.status === 'trial' ? 'Trial' :
                     sub.companies?.status === 'suspended' ? 'Suspensa' : 'Cancelada'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="space-y-2 min-w-[250px]">
                    {/* Users */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 w-16">
                        {getUsageIcon('users')}
                        <span className="text-xs text-muted-foreground">
                          {sub.current_users}/{sub.max_users}
                        </span>
                      </div>
                      <div className="flex-1">
                        <Progress 
                          value={sub.usage_percentage.users} 
                          className="h-2"
                        />
                      </div>
                      <span className={`text-xs font-medium ${getUsageColor(sub.usage_percentage.users)}`}>
                        {sub.usage_percentage.users.toFixed(0)}%
                      </span>
                      {sub.usage_percentage.users >= 90 && (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      )}
                    </div>

                    {/* Professionals */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 w-16">
                        {getUsageIcon('professionals')}
                        <span className="text-xs text-muted-foreground">
                          {sub.current_professionals}/{sub.max_professionals}
                        </span>
                      </div>
                      <div className="flex-1">
                        <Progress 
                          value={sub.usage_percentage.professionals} 
                          className="h-2"
                        />
                      </div>
                      <span className={`text-xs font-medium ${getUsageColor(sub.usage_percentage.professionals)}`}>
                        {sub.usage_percentage.professionals.toFixed(0)}%
                      </span>
                      {sub.usage_percentage.professionals >= 90 && (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      )}
                    </div>

                    {/* WhatsApp */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 w-16">
                        {getUsageIcon('whatsapp')}
                        <span className="text-xs text-muted-foreground">
                          {sub.current_whatsapp_numbers}/{sub.max_whatsapp_numbers}
                        </span>
                      </div>
                      <div className="flex-1">
                        <Progress 
                          value={sub.usage_percentage.whatsapp} 
                          className="h-2"
                        />
                      </div>
                      <span className={`text-xs font-medium ${getUsageColor(sub.usage_percentage.whatsapp)}`}>
                        {sub.usage_percentage.whatsapp.toFixed(0)}%
                      </span>
                      {sub.usage_percentage.whatsapp >= 90 && (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right font-semibold">
                  R$ {sub.monthly_revenue.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditLimits(sub.company_id)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar Limites
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleViewHistory(sub.company_id)}>
                        <History className="h-4 w-4 mr-2" />
                        Ver Histórico
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedCompanyId && (
        <>
          <EditLimitsDialog
            companyId={selectedCompanyId}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
          />
          <SubscriptionHistoryDialog
            companyId={selectedCompanyId}
            open={historyDialogOpen}
            onOpenChange={setHistoryDialogOpen}
          />
        </>
      )}
    </div>
  );
};

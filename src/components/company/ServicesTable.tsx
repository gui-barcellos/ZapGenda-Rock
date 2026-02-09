import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertTriangle, Edit, MoreHorizontal, Power, PowerOff } from "lucide-react";

interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
  color: string;
  is_active: boolean;
  description?: string;
  professionals?: Array<{
    id: string;
    name: string;
    specialty: string | null;
  }>;
}

interface ServicesTableProps {
  services: Service[];
  onEdit: (service: Service) => void;
  onDelete: (serviceId: string) => void;
}

export function ServicesTable({ services, onEdit, onDelete }: ServicesTableProps) {
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}min`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${mins}min`;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Profissionais</TableHead>
            <TableHead>Duração</TableHead>
            <TableHead>Preço</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Nenhum serviço cadastrado
              </TableCell>
            </TableRow>
          ) : (
            services.map((service) => (
              <TableRow key={service.id}>
                <TableCell className="font-medium">{service.name}</TableCell>
                <TableCell className="text-sm">
                  {service.professionals && service.professionals.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {service.professionals.map((prof) => (
                        <span key={prof.id} className="text-xs">
                          {prof.name}
                          {prof.specialty && ` - ${prof.specialty}`}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-amber-600">
                      <AlertTriangle className="h-3 w-3" />
                      <span className="text-xs">Nenhum profissional vinculado</span>
                    </div>
                  )}
                </TableCell>
                <TableCell>{formatDuration(service.duration)}</TableCell>
                <TableCell>{formatPrice(service.price)}</TableCell>
                <TableCell>
                  {service.is_active ? (
                    <Badge variant="default" className="bg-green-600">Ativo</Badge>
                  ) : service.professionals && service.professionals.length === 0 ? (
                    <Badge variant="secondary" className="bg-amber-600">Sem profissionais</Badge>
                  ) : (
                    <Badge variant="secondary">Inativo</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-card">
                      <DropdownMenuItem onClick={() => onEdit(service)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete(service.id)}
                        className={service.is_active ? "text-amber-600" : "text-green-600"}
                      >
                        {service.is_active ? (
                          <>
                            <PowerOff className="h-4 w-4 mr-2" />
                            Desativar
                          </>
                        ) : (
                          <>
                            <Power className="h-4 w-4 mr-2" />
                            Ativar
                          </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

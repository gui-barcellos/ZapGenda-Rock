import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Power, PowerOff } from "lucide-react";

interface Professional {
  id: string;
  name: string;
  specialty?: string;
  color: string;
  photo_url?: string;
  is_active: boolean;
}

interface ProfessionalsTableProps {
  professionals: Professional[];
  onEdit: (professional: Professional) => void;
  onDelete: (professionalId: string) => void;
}

export function ProfessionalsTable({ professionals, onEdit, onDelete }: ProfessionalsTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Profissional</TableHead>
            <TableHead>Especialidade</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {professionals.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Nenhum profissional cadastrado
              </TableCell>
            </TableRow>
          ) : (
            professionals.map((professional) => (
              <TableRow key={professional.id}>
                <TableCell>
                  <span className="font-medium">{professional.name}</span>
                </TableCell>
                <TableCell>{professional.specialty || "-"}</TableCell>
                <TableCell>
                  <Badge variant={professional.is_active ? "default" : "secondary"}>
                    {professional.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-card">
                      <DropdownMenuItem onClick={() => onEdit(professional)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete(professional.id)}
                        className={professional.is_active ? "text-amber-600" : "text-green-600"}
                      >
                        {professional.is_active ? (
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

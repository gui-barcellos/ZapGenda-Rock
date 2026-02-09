import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Invite {
  id: string;
  email: string;
  role: string;
  created_at: string;
  expires_at: string;
  invited_by_name?: string;
  status: string;
}

interface PendingInvitesTableProps {
  invites: Invite[];
  onResend: (email: string, role: string) => void;
  onCancel: (inviteId: string) => void;
  canManage: boolean;
}

export function PendingInvitesTable({ invites, onResend, onCancel, canManage }: PendingInvitesTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Enviado por</TableHead>
            <TableHead>Data de Envio</TableHead>
            <TableHead>Expira em</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[100px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invites.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                Nenhum convite pendente
              </TableCell>
            </TableRow>
          ) : (
            invites.map((invite) => (
              <TableRow key={invite.id}>
                <TableCell className="font-medium">{invite.email}</TableCell>
                <TableCell>
                  <Badge variant={invite.role === "admin" ? "default" : "secondary"}>
                    {invite.role === "admin" ? "Administrador" : "Atendente"}
                  </Badge>
                </TableCell>
                <TableCell>{invite.invited_by_name || "-"}</TableCell>
                <TableCell>
                  {format(new Date(invite.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </TableCell>
                <TableCell>
                  {format(new Date(invite.expires_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </TableCell>
                <TableCell>
                  <Badge variant={invite.status === "pending" ? "secondary" : "outline"}>
                    {invite.status === "pending" ? "Pendente" : "Expirado"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {canManage && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onResend(invite.email, invite.role)}
                        title="Reenviar convite"
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onCancel(invite.id)}
                        title="Cancelar convite"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

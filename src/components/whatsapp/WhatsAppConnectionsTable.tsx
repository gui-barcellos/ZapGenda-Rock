import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Star } from "lucide-react";
import {
  useWhatsAppConnections,
  useDeleteWhatsAppConnection,
  useUpdateWhatsAppConnection,
} from "@/hooks/useWhatsAppConnections";
import { Skeleton } from "@/components/ui/skeleton";

export const WhatsAppConnectionsTable = () => {
  const { data: connections, isLoading } = useWhatsAppConnections();
  const deleteConnection = useDeleteWhatsAppConnection();
  const updateConnection = useUpdateWhatsAppConnection();

  const handleSetPrimary = async (id: string) => {
    // First, unset all other connections
    connections?.forEach(async (conn) => {
      if (conn.is_primary && conn.id !== id) {
        await updateConnection.mutateAsync({ id: conn.id, is_primary: false });
      }
    });
    // Then set the new primary
    await updateConnection.mutateAsync({ id, is_primary: true });
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!connections || connections.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma conexão WhatsApp configurada
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Telefone</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Principal</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {connections.map((connection) => (
          <TableRow key={connection.id}>
            <TableCell className="font-medium">{connection.name || "Sem nome"}</TableCell>
            <TableCell>{connection.phone || "—"}</TableCell>
            <TableCell>
              <Badge variant={connection.is_connected ? "default" : "secondary"}>
                {connection.is_connected ? "Conectado" : "Desconectado"}
              </Badge>
            </TableCell>
            <TableCell>
              {connection.is_primary ? (
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSetPrimary(connection.id)}
                >
                  <Star className="h-4 w-4" />
                </Button>
              )}
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteConnection.mutate(connection.id)}
                disabled={deleteConnection.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

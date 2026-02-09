import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Edit } from "lucide-react";
import { useResourcePrices } from "@/hooks/useSubscriptions";
import { EditPricesDialog } from "./EditPricesDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const RESOURCE_LABELS: Record<string, string> = {
  base_plan: "🎯 Plano Base",
  user: "👥 Usuário Extra",
  professional: "👨‍⚕️ Profissional Extra",
  whatsapp: "📱 WhatsApp Extra",
  contacts_1k: "📇 1.000 Contatos",
};

export const ResourcePricesTab = () => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { data: prices, isLoading } = useResourcePrices();

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Preços de Recursos</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie os preços mensais de cada recurso
          </p>
        </div>
        <Button onClick={() => setEditDialogOpen(true)}>
          <Edit className="h-4 w-4 mr-2" />
          Editar Preços
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Recurso</TableHead>
              <TableHead className="text-right">Preço Mensal</TableHead>
              <TableHead className="text-right">Última Atualização</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prices?.map((price) => (
              <TableRow key={price.id}>
                <TableCell className="font-medium">
                  {RESOURCE_LABELS[price.resource_type] || price.resource_type}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">
                      R$ {Number(price.monthly_price).toFixed(2)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {price.updated_at 
                    ? format(new Date(price.updated_at), "dd/MM/yyyy", { locale: ptBR })
                    : "Nunca atualizado"
                  }
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <EditPricesDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        currentPrices={prices || []}
      />
    </div>
  );
};

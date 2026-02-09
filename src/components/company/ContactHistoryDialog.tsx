import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Contact } from "@/hooks/useContacts";
import { useAppointments } from "@/hooks/useAppointments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2 } from "lucide-react";

interface ContactHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact | null;
}

const statusColors = {
  scheduled: "bg-blue-500",
  confirmed: "bg-green-500",
  completed: "bg-gray-500",
  cancelled: "bg-red-500",
  no_show: "bg-orange-500",
};

const statusLabels = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  completed: "Realizado",
  cancelled: "Cancelado",
  no_show: "Não Compareceu",
};

export default function ContactHistoryDialog({ open, onOpenChange, contact }: ContactHistoryDialogProps) {
  const { data: appointments, isLoading } = useAppointments(
    undefined,
    undefined,
    undefined
  );

  if (!contact) return null;

  const contactAppointments = appointments?.filter(
    (apt: any) => apt.contact_id === contact.id
  ) || [];

  const totalSpent = contactAppointments
    .filter((apt: any) => apt.status === "completed")
    .reduce((sum: number, apt: any) => sum + (apt.service?.price || 0), 0);

  const lastVisit = contactAppointments
    .filter((apt: any) => apt.status === "completed")
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico de {contact.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do Contato */}
          <Card>
            <CardHeader>
              <CardTitle>Informações do Contato</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Telefone</p>
                <p className="font-medium">{contact.phone}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{contact.email || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data de Nascimento</p>
                <p className="font-medium">
                  {contact.birth_date
                    ? format(parseISO(contact.birth_date), "dd/MM/yyyy", { locale: ptBR })
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tags</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {contact.tags && contact.tags.length > 0 ? (
                    contact.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Estatísticas */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Total de Agendamentos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{contactAppointments.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Total Gasto</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {totalSpent.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Última Visita</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-medium">
                  {lastVisit
                    ? format(parseISO(lastVisit.date), "dd/MM/yyyy", { locale: ptBR })
                    : "-"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Lista de Agendamentos */}
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Agendamentos</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : contactAppointments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum agendamento encontrado
                </p>
              ) : (
                <div className="space-y-4">
                  {contactAppointments
                    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((apt: any) => (
                      <div
                        key={apt.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">{apt.service?.name}</p>
                            <Badge className={statusColors[apt.status as keyof typeof statusColors]}>
                              {statusLabels[apt.status as keyof typeof statusLabels]}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(parseISO(apt.date), "dd/MM/yyyy", { locale: ptBR })} às{" "}
                            {apt.start_time}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Profissional: {apt.professional?.name}
                          </p>
                          {apt.notes && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Obs: {apt.notes}
                            </p>
                          )}
                        </div>
                        {apt.service?.price && (
                          <div className="text-right">
                            <p className="font-medium">
                              {apt.service.price.toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

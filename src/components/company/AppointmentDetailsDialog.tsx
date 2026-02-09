import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle, XCircle, Edit, MessageSquare, Trash2 } from "lucide-react";
import {
  useConfirmAppointment,
  useCompleteAppointment,
  useCancelAppointment,
  useMarkNoShow,
  useDeleteAppointment,
} from "@/hooks/useAppointments";
import { useSchedulingTags } from "@/hooks/useSchedulingTags";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

interface AppointmentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: any;
  onEdit: () => void;
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

export default function AppointmentDetailsDialog({
  open,
  onOpenChange,
  appointment,
  onEdit,
}: AppointmentDetailsDialogProps) {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const confirmAppointment = useConfirmAppointment();
  const completeAppointment = useCompleteAppointment();
  const cancelAppointment = useCancelAppointment();
  const markNoShow = useMarkNoShow();
  const deleteAppointment = useDeleteAppointment();

  const { data: schedulingTags } = useSchedulingTags();

  const getTagColor = (tagName: string) => {
    const tag = schedulingTags?.find(t => t.name === tagName);
    return tag?.color || '#3b82f6';
  };

  if (!appointment) return null;

  const handleConfirm = () => {
    confirmAppointment.mutate(appointment.id, {
      onSuccess: () => onOpenChange(false),
    });
  };

  const handleComplete = () => {
    completeAppointment.mutate(appointment.id, {
      onSuccess: () => onOpenChange(false),
    });
  };

  const handleNoShow = () => {
    markNoShow.mutate(appointment.id, {
      onSuccess: () => onOpenChange(false),
    });
  };

  const handleCancel = () => {
    cancelAppointment.mutate(
      { id: appointment.id, reason: cancelReason },
      {
        onSuccess: () => {
          setCancelDialogOpen(false);
          setCancelReason("");
          onOpenChange(false);
        },
      }
    );
  };

  const handleDelete = () => {
    deleteAppointment.mutate(appointment.id, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        onOpenChange(false);
      },
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Agendamento</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Status */}
            <div className="flex items-center justify-between">
              <Badge className={statusColors[appointment.status as keyof typeof statusColors]}>
                {statusLabels[appointment.status as keyof typeof statusLabels]}
              </Badge>
              {appointment.confirmation_sent && (
                <Badge variant="outline">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Confirmação Enviada
                </Badge>
              )}
            </div>

            <Separator />

            {/* Informações do Cliente */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                Cliente
              </h3>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Nome:</span>{" "}
                  <span className="font-medium">{appointment.contact?.name}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Telefone:</span>{" "}
                  {appointment.contact?.phone}
                </p>
                {appointment.contact?.email && (
                  <p>
                    <span className="text-muted-foreground">Email:</span>{" "}
                    {appointment.contact.email}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            {/* Informações do Agendamento */}
            <div>
              <h3 className="font-semibold mb-2">Agendamento</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Profissional</p>
                  <p className="font-medium">{appointment.professional?.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Serviço</p>
                  <p className="font-medium">{appointment.service?.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Data</p>
                  <p className="font-medium">
                    {format(parseISO(appointment.date), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Horário</p>
                  <p className="font-medium">
                    {appointment.start_time} - {appointment.end_time}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Duração</p>
                  <p className="font-medium">{appointment.service?.duration} minutos</p>
                </div>
                {appointment.service?.price && (
                  <div>
                    <p className="text-muted-foreground">Valor</p>
                    <p className="font-medium">
                      {appointment.service.price.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {appointment.notes && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2">Observações</h3>
                  <p className="text-sm text-muted-foreground">{appointment.notes}</p>
                </div>
              </>
            )}

            <Separator />

          {/* Ações */}
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={handleConfirm}
              style={{ backgroundColor: getTagColor("Confirmou"), color: "#ffffff" }}
              className="hover:opacity-90"
            >
              Confirmar
            </Button>

            <Button 
              onClick={() => setCancelDialogOpen(true)}
              style={{ backgroundColor: getTagColor("Cancelou"), color: "#ffffff" }}
              className="hover:opacity-90"
            >
              Cancelar
            </Button>

            <Button 
              onClick={handleComplete}
              style={{ backgroundColor: getTagColor("Compareceu"), color: "#ffffff" }}
              className="hover:opacity-90"
            >
              Compareceu
            </Button>

            <Button 
              onClick={handleNoShow}
              style={{ backgroundColor: getTagColor("Não Compareceu"), color: "#ffffff" }}
              className="hover:opacity-90"
            >
              Não Compareceu
            </Button>

            <Button 
              variant="destructive" 
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>

            <Button variant="outline" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Agendamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar este agendamento?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Motivo do cancelamento (opcional)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel}>Cancelar Agendamento</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Agendamento</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. O agendamento será removido permanentemente 
              do sistema, incluindo de todos os relatórios. É como se ele nunca tivesse existido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

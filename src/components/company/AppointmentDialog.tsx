import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, addMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Appointment, useCreateAppointment, useUpdateAppointment } from "@/hooks/useAppointments";
import { useProfessionals } from "@/hooks/useProfessionals";
import { useServices } from "@/hooks/useServices";
import { useContacts } from "@/hooks/useContacts";
import { useServiceProfessionals } from "@/hooks/useServiceProfessionals";
import { useServiceAvailabilityMap } from "@/hooks/useServiceAvailability";
import { toast } from "sonner";

const appointmentSchema = z.object({
  professional_id: z.string().min(1, "Selecione um profissional"),
  service_id: z.string().min(1, "Selecione um serviço"),
  contact_id: z.string().min(1, "Selecione um contato"),
  date: z.string().min(1, "Selecione uma data"),
  start_time: z.string().min(1, "Selecione um horário"),
  end_time: z.string().min(1),
  status: z.enum(["scheduled", "confirmed", "completed", "cancelled", "no_show"]),
  notes: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface AppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Appointment | null;
  defaultValues?: Partial<AppointmentFormData>;
}

export default function AppointmentDialog({
  open,
  onOpenChange,
  appointment,
  defaultValues,
}: AppointmentDialogProps) {
  const createAppointment = useCreateAppointment();
  const updateAppointment = useUpdateAppointment();
  const { professionals = [] } = useProfessionals();
  const { services = [] } = useServices();
  const { data: contactsData } = useContacts();
  const contacts = contactsData?.contacts || [];

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      professional_id: "",
      service_id: "",
      contact_id: "",
      date: "",
      start_time: "",
      end_time: "",
      status: "scheduled",
      notes: "",
    },
  });

  const selectedServiceId = form.watch("service_id");
  const selectedStartTime = form.watch("start_time");
  const selectedEndTime = form.watch("end_time");
  const selectedDate = form.watch("date");
  const selectedProfessionalId = form.watch("professional_id");
  const { serviceProfessionals } = useServiceProfessionals(selectedServiceId);
  
  // Mapear disponibilidade de todos os serviços
  const { data: serviceAvailabilityMap, isLoading: isCheckingAvailability } = useServiceAvailabilityMap(
    services,
    selectedDate,
    selectedStartTime,
    selectedEndTime,
    selectedProfessionalId
  );

  // Filtrar profissionais baseado no serviço selecionado
  const availableProfessionals = selectedServiceId && serviceProfessionals
    ? professionals.filter(prof =>
        serviceProfessionals.some(sp => sp.professional_id === prof.id)
      )
    : professionals;

  useEffect(() => {
    if (appointment) {
      form.reset({
        professional_id: appointment.professional_id,
        service_id: appointment.service_id,
        contact_id: appointment.contact_id,
        date: appointment.date,
        start_time: appointment.start_time,
        end_time: appointment.end_time,
        status: appointment.status,
        notes: appointment.notes || "",
      });
    } else if (defaultValues) {
      form.reset({
        ...form.getValues(),
        ...defaultValues,
      });
    } else {
      form.reset({
        professional_id: "",
        service_id: "",
        contact_id: "",
        date: "",
        start_time: "",
        end_time: "",
        status: "scheduled",
        notes: "",
      });
    }
  }, [appointment, defaultValues, form]);

  // Auto-calculate end time based on service duration
  useEffect(() => {
    if (selectedServiceId && selectedStartTime) {
      const service = services.find((s) => s.id === selectedServiceId);
      if (service) {
        const [hours, minutes] = selectedStartTime.split(":").map(Number);
        const startDate = new Date();
        startDate.setHours(hours, minutes, 0);
        const endDate = addMinutes(startDate, service.duration);
        const endTime = format(endDate, "HH:mm");
        form.setValue("end_time", endTime);
      }
    }
  }, [selectedServiceId, selectedStartTime, services, form]);

  const onSubmit = (data: AppointmentFormData) => {
    if (appointment) {
      updateAppointment.mutate(
        { id: appointment.id, data },
        {
          onSuccess: () => {
            onOpenChange(false);
            form.reset();
          },
        }
      );
    } else {
      createAppointment.mutate(data as any, {
        onSuccess: () => {
          onOpenChange(false);
          form.reset();
        },
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{appointment ? "Editar Agendamento" : "Novo Agendamento"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="professional_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profissional *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableProfessionals
                          .filter((p) => p.is_active)
                          .map((professional) => (
                            <SelectItem key={professional.id} value={professional.id}>
                              {professional.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

            <FormField
              control={form.control}
              name="service_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Serviço *</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      // Verificar se serviço está disponível antes de selecionar
                      const isAvailable = serviceAvailabilityMap?.get(value) ?? true;
                      
                      if (!isAvailable) {
                        toast.error("Serviço indisponível na data e horário selecionado");
                        return; // Previne a seleção
                      }
                      
                      field.onChange(value);
                    }} 
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {services
                        .filter((s) => s.is_active)
                        .map((service) => {
                          const hasDateTimeSelected = selectedDate && selectedStartTime && selectedEndTime;
                          const isAvailable = hasDateTimeSelected 
                            ? (serviceAvailabilityMap?.get(service.id) ?? false) 
                            : true;
                          
                          return (
                            <SelectItem 
                              key={service.id} 
                              value={service.id}
                              className={cn(
                                !isAvailable && hasDateTimeSelected && "text-red-500 opacity-50 cursor-not-allowed line-through"
                              )}
                              disabled={!isAvailable}
                            >
                              {service.name} ({service.duration} min)
                              {!isAvailable && hasDateTimeSelected && " - ❌ Indisponível"}
                            </SelectItem>
                          );
                        })}
                     </SelectContent>
                  </Select>
                  {!selectedDate || !selectedStartTime ? (
                    <p className="text-sm text-muted-foreground">
                      ℹ️ Selecione data e horário primeiro para ver disponibilidade
                    </p>
                  ) : isCheckingAvailability ? (
                    <p className="text-sm text-blue-500">
                      ⏳ Verificando disponibilidade...
                    </p>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />
            </div>

            <FormField
              control={form.control}
              name="contact_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.name} - {contact.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(new Date(field.value), "dd/MM/yyyy", { locale: ptBR })
                            ) : (
                              <span>Selecione</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário Início *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário Fim</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="scheduled">Agendado</SelectItem>
                      <SelectItem value="confirmed">Confirmado</SelectItem>
                      <SelectItem value="completed">Realizado</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                      <SelectItem value="no_show">Não Compareceu</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Observações..." rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createAppointment.isPending || updateAppointment.isPending}
              >
                {appointment ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

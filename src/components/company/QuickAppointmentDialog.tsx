import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, addMinutes, addDays, startOfMonth, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useCreateAppointment, useUpdateAppointment } from "@/hooks/useAppointments";
import { useProfessionals } from "@/hooks/useProfessionals";
import { useServices } from "@/hooks/useServices";
import { useContacts } from "@/hooks/useContacts";
import { useSchedulingRules } from "@/hooks/useSchedulingRules";
import { getAvailableMonths } from "@/lib/scheduling-validation";
import { ContactSearchSelect } from "./ContactSearchSelect";
import { TimeRangeInput } from "./TimeRangeInput";
import { useCompanyData } from "@/hooks/useCompanyData";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useServiceAvailabilityMap } from "@/hooks/useServiceAvailability";
import { toast } from "sonner";

const quickAppointmentSchema = z.object({
  professional_id: z.string().min(1, "Selecione um profissional"),
  service_id: z.string().min(1, "Selecione um serviço"),
  contact_id: z.string().min(1, "Selecione um contato"),
  date: z.string().min(1, "Selecione uma data"),
  start_time: z.string().min(1, "Selecione um horário"),
  end_time: z.string(),
});

type QuickAppointmentFormData = z.infer<typeof quickAppointmentSchema>;

interface QuickAppointmentPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: Partial<QuickAppointmentFormData>;
  appointmentId?: string;
}

export default function QuickAppointmentDialog({
  open,
  onOpenChange,
  defaultValues,
  appointmentId,
}: QuickAppointmentPanelProps) {
  const createAppointment = useCreateAppointment();
  const updateAppointment = useUpdateAppointment();
  const { professionals = [] } = useProfessionals();
  const { services = [] } = useServices();
  const { data: contactsData } = useContacts();
  const contacts = contactsData?.contacts || [];
  const { rules } = useSchedulingRules();
  const { companyData } = useCompanyData();

  // Buscar todos os vínculos service_professionals
  const { data: allServiceProfessionals } = useQuery({
    queryKey: ["service-professionals-all"],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      const { data, error } = await supabase
        .from("service_professionals")
        .select("service_id, professional_id")
        .eq("company_id", profile.company_id);
      
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<QuickAppointmentFormData>({
    resolver: zodResolver(quickAppointmentSchema),
    defaultValues: {
      professional_id: "",
      service_id: "",
      contact_id: "",
      date: "",
      start_time: companyData?.business_hours?.find(bh => bh.is_active)?.start || "08:00",
      end_time: "",
    },
  });

  const selectedServiceId = form.watch("service_id");
  const selectedStartTime = form.watch("start_time");
  const selectedProfessionalId = form.watch("professional_id");
  const selectedDate = form.watch("date");
  const selectedEndTime = form.watch("end_time");

  const { data: serviceAvailabilityMap, isLoading: isCheckingAvailability } = useServiceAvailabilityMap(
    services,
    selectedDate,
    selectedStartTime,
    selectedEndTime,
    selectedProfessionalId
  );

  useEffect(() => {
    if (defaultValues) {
      form.reset({
        ...form.getValues(),
        ...defaultValues,
      });
    }
  }, [defaultValues, form]);

  // Auto-calculate end time
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

  // Resetar serviço quando profissional mudar
  useEffect(() => {
    if (selectedProfessionalId && selectedServiceId) {
      // Verificar se o serviço selecionado ainda é válido para o novo profissional
      const isStillValid = allServiceProfessionals?.some(
        sp => sp.service_id === selectedServiceId && 
              sp.professional_id === selectedProfessionalId
      );
      
      if (!isStillValid) {
        form.setValue("service_id", "");
      }
    }
  }, [selectedProfessionalId, allServiceProfessionals, selectedServiceId, form]);

  const onSubmit = (data: QuickAppointmentFormData) => {
    if (appointmentId) {
      // Modo de edição
      updateAppointment.mutate(
        {
          id: appointmentId,
          data: {
            professional_id: data.professional_id,
            service_id: data.service_id,
            contact_id: data.contact_id,
            date: data.date,
            start_time: data.start_time,
            end_time: data.end_time,
          },
        },
        {
          onSuccess: () => {
            onOpenChange(false);
            form.reset();
          },
        }
      );
    } else {
      // Modo de criação
      createAppointment.mutate(
        {
          ...data,
          status: "scheduled",
        } as any,
        {
          onSuccess: () => {
            onOpenChange(false);
            form.reset();
          },
        }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{appointmentId ? "Editar Agendamento" : "Novo Agendamento Rápido"}</DialogTitle>
          <DialogDescription>{appointmentId ? "Edite as informações do agendamento" : "Crie um agendamento rapidamente"}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-6">
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
                      {professionals
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
                      const hasDateTimeSelected = selectedDate && selectedStartTime && selectedEndTime;
                      const isAvailable = hasDateTimeSelected 
                        ? (serviceAvailabilityMap?.get(value) ?? false) 
                        : true;
                      
                      if (!isAvailable) {
                        toast.error("Serviço indisponível na data e horário selecionados");
                        return;
                      }
                      
                      field.onChange(value);
                    }} 
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={
                          !selectedProfessionalId 
                            ? "Selecione um profissional primeiro" 
                            : "Selecione"
                        } />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {services
                        .filter((s) => {
                          if (!s.is_active) return false;
                          
                          // Se nenhum profissional selecionado, não mostrar serviços
                          if (!selectedProfessionalId) return false;
                          
                          // Verificar se o serviço está vinculado ao profissional
                          const isLinked = allServiceProfessionals?.some(
                            sp => sp.service_id === s.id && sp.professional_id === selectedProfessionalId
                          );
                          
                          return isLinked;
                        })
                        .map((service) => {
                          const hasDateTimeSelected = selectedDate && selectedStartTime && selectedEndTime;
                          const isAvailable = hasDateTimeSelected 
                            ? (serviceAvailabilityMap?.get(service.id) ?? false) 
                            : true;
                          
                          return (
                            <SelectItem 
                              key={service.id} 
                              value={service.id}
                              disabled={!isAvailable}
                              className={cn(
                                !isAvailable && hasDateTimeSelected && "opacity-50 text-red-500 cursor-not-allowed"
                              )}
                            >
                              {service.name} ({service.duration} min)
                              {!isAvailable && hasDateTimeSelected && " (Serviço indisponível nesta data e horário)"}
                            </SelectItem>
                          );
                        })}
                    </SelectContent>
                  </Select>
                  {!selectedDate || !selectedStartTime ? (
                    <p className="text-sm text-muted-foreground mt-1">
                      ℹ️ Selecione data e horário primeiro para ver disponibilidade
                    </p>
                  ) : isCheckingAvailability ? (
                    <p className="text-sm text-blue-500 mt-1">
                      ⏳ Verificando disponibilidade...
                    </p>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contact_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente *</FormLabel>
                  <FormControl>
                    <ContactSearchSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Buscar por nome, telefone ou CPF..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                            format(new Date(field.value + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })
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
                        selected={field.value ? new Date(field.value + "T00:00:00") : undefined}
                        onSelect={(date) => {
                          if (date) {
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            const dateStr = `${year}-${month}-${day}`;
                            field.onChange(dateStr);
                          } else {
                            field.onChange("");
                          }
                        }}
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          
                          // Bloquear datas passadas
                          if (date < today) return true;
                          
                          // Se não tem regras ainda, apenas bloquear passado
                          if (!rules) return false;
                          
                          // Verificar modo de agendamento
                          if (rules.scheduling_mode === 'monthly') {
                            const availableMonths = getAvailableMonths(rules);
                            const dateMonth = startOfMonth(date);
                            const isMonthAvailable = availableMonths.some(
                              month => isSameMonth(month, dateMonth)
                            );
                            return !isMonthAvailable;
                          } else {
                            // Modo rolling: verificar limite de dias
                            const maxDate = addDays(today, rules.max_advance_days_manual);
                            return date > maxDate;
                          }
                        }}
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
                  <FormLabel>Horários *</FormLabel>
                  <FormControl>
                    <TimeRangeInput
                      startTime={field.value}
                      endTime={form.watch("end_time")}
                      duration={services.find(s => s.id === selectedServiceId)?.duration}
                      businessHours={{
                        opening_time: companyData?.business_hours?.find(bh => bh.is_active)?.start || "08:00",
                        closing_time: companyData?.business_hours?.find(bh => bh.is_active)?.end || "18:00",
                      }}
                      onStartTimeChange={field.onChange}
                      onEndTimeChange={(time) => form.setValue("end_time", time)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createAppointment.isPending || updateAppointment.isPending} 
                className="flex-1"
              >
                {appointmentId ? "Salvar Alterações" : "Criar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

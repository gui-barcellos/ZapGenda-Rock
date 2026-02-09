import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, X, Tags } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Contact, useCreateContact, useUpdateContact } from "@/hooks/useContacts";
import { Badge } from "@/components/ui/badge";
import { useCheckDuplicatePhone } from "@/hooks/useCheckDuplicatePhone";
import SelectTagsDialog from "./SelectTagsDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { normalizePhoneWithCountryCode, formatPhoneDisplay } from "@/lib/phone-utils";

const contactSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100),
  phone: z.string().min(1, "Telefone é obrigatório"),
  secondary_phone: z.string().optional(),
  cpf: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  birth_date: z.string().optional(),
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string()).optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface ContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact | null;
  onSuccess?: (contact: Contact) => void;
}

// Função para formatar CPF
const formatCPF = (value: string) => {
  const numbers = value.replace(/\D/g, "").slice(0, 11);
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
};

// Função para formatar telefone brasileiro
const formatPhoneNumber = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
  }
  return numbers.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
};

export default function ContactDialog({ open, onOpenChange, contact, onSuccess }: ContactDialogProps) {
  const [dateInput, setDateInput] = useState("");
  const [tagsDialogOpen, setTagsDialogOpen] = useState(false);
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      phone: "",
      secondary_phone: "",
      cpf: "",
      email: "",
      birth_date: "",
      notes: "",
      tags: [],
    },
  });

  // Check for duplicate phone
  const phoneValue = form.watch("phone");
  const { data: duplicateContact } = useCheckDuplicatePhone(phoneValue, contact?.id);

  useEffect(() => {
    if (contact) {
      form.reset({
        name: contact.name,
        phone: formatPhoneDisplay(contact.phone),
        secondary_phone: contact.secondary_phone ? formatPhoneDisplay(contact.secondary_phone) : "",
        cpf: contact.cpf ? formatCPF(contact.cpf) : "",
        email: contact.email || "",
        birth_date: contact.birth_date || "",
        notes: contact.notes || "",
        tags: contact.tags || [],
      });
      setDateInput(contact.birth_date ? format(new Date(contact.birth_date + "T00:00:00"), "dd/MM/yyyy") : "");
    } else {
      form.reset({
        name: "",
        phone: "",
        secondary_phone: "",
        cpf: "",
        email: "",
        birth_date: "",
        notes: "",
        tags: [],
      });
      setDateInput("");
    }
  }, [contact, form]);

  const onSubmit = (data: ContactFormData) => {
    // Normalizar telefones e CPF antes de salvar
    const normalizedData = {
      ...data,
      phone: normalizePhoneWithCountryCode(data.phone),
      secondary_phone: data.secondary_phone ? normalizePhoneWithCountryCode(data.secondary_phone) : null,
      cpf: data.cpf ? data.cpf.replace(/\D/g, "") : null, // Salvar apenas números
    };

    if (contact) {
      updateContact.mutate(
        { id: contact.id, data: normalizedData },
        {
          onSuccess: () => {
            onOpenChange(false);
            form.reset();
          },
        }
      );
    } else {
      createContact.mutate(normalizedData as any, {
        onSuccess: (newContact) => {
          onOpenChange(false);
          form.reset();
          if (onSuccess) {
            onSuccess(newContact);
          }
        },
      });
    }
  };

  const handleAddTag = (tag: string) => {
    const currentTags = form.getValues("tags") || [];
    if (tag && !currentTags.includes(tag)) {
      form.setValue("tags", [...currentTags, tag]);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = form.getValues("tags") || [];
    form.setValue(
      "tags",
      currentTags.filter((tag) => tag !== tagToRemove)
    );
  };

  const handleTagToggle = (tag: string) => {
    const currentTags = form.getValues("tags") || [];
    if (currentTags.includes(tag)) {
      handleRemoveTag(tag);
    } else {
      handleAddTag(tag);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{contact ? "Editar Contato" : "Novo Contato"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cpf"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CPF</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="000.000.000-00" 
                      {...field}
                      onChange={(e) => {
                        const formatted = formatCPF(e.target.value);
                        field.onChange(formatted);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone Principal *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="(00) 00000-0000" 
                        {...field}
                        onChange={(e) => {
                          const formatted = formatPhoneNumber(e.target.value);
                          field.onChange(formatted);
                        }}
                      />
                    </FormControl>
                    {duplicateContact && (
                      <Alert variant="destructive" className="mt-2">
                        <AlertDescription>
                          Este número já está cadastrado para: <strong>{duplicateContact.name}</strong>
                        </AlertDescription>
                      </Alert>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="secondary_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone Secundário</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="(00) 00000-0000" 
                        {...field}
                        onChange={(e) => {
                          const formatted = formatPhoneNumber(e.target.value);
                          field.onChange(formatted);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email@exemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="birth_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data de Nascimento</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        placeholder="DD/MM/AAAA"
                        value={dateInput}
                        onChange={(e) => {
                          const value = e.target.value;
                          const numbers = value.replace(/\D/g, "");
                          
                          let formatted = numbers;
                          if (numbers.length >= 2) {
                            formatted = numbers.slice(0, 2) + "/" + numbers.slice(2);
                          }
                          if (numbers.length >= 4) {
                            formatted = numbers.slice(0, 2) + "/" + numbers.slice(2, 4) + "/" + numbers.slice(4, 8);
                          }
                          
                          setDateInput(formatted);
                          
                          if (numbers.length === 8) {
                            const day = parseInt(numbers.slice(0, 2));
                            const month = parseInt(numbers.slice(2, 4));
                            const year = parseInt(numbers.slice(4, 8));
                            
                            if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900) {
                              const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                              field.onChange(dateStr);
                            }
                          } else if (numbers.length === 0) {
                            field.onChange("");
                          }
                        }}
                        className="flex-1"
                      />
                    </FormControl>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="px-3"
                          type="button"
                        >
                          <CalendarIcon className="h-4 w-4" />
                        </Button>
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
                              setDateInput(format(date, "dd/MM/yyyy"));
                            } else {
                              field.onChange("");
                              setDateInput("");
                            }
                          }}
                          disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                          captionLayout="dropdown-buttons"
                          fromYear={1900}
                          toYear={new Date().getFullYear()}
                          locale={ptBR}
                          initialFocus
                          classNames={{
                            caption_label: "hidden",
                            nav: "hidden",
                          }}
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => setTagsDialogOpen(true)}
                    >
                      <Tags className="h-4 w-4 mr-2" />
                      Selecionar Tags
                      {field.value && field.value.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {field.value.length}
                        </Badge>
                      )}
                    </Button>
                    
                    {field.value && field.value.length > 0 && (
                      <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-muted/30">
                        {field.value.map((tag) => (
                          <Badge
                            key={tag}
                            variant="default"
                            className="cursor-pointer"
                            onClick={() => handleRemoveTag(tag)}
                          >
                            {tag}
                            <X className="ml-1 h-3 w-3" />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
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
                    <Textarea placeholder="Observações adicionais..." rows={4} {...field} />
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
                disabled={createContact.isPending || updateContact.isPending || !!duplicateContact}
              >
                {contact ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </form>
        </Form>

        <SelectTagsDialog
          open={tagsDialogOpen}
          onOpenChange={setTagsDialogOpen}
          selectedTags={form.watch("tags") || []}
          onTagToggle={handleTagToggle}
        />
      </DialogContent>
    </Dialog>
  );
}

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSubscriptionDetails, useUpdateLimits } from "@/hooks/useSubscriptions";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  max_users: z.coerce.number().min(1, "Mínimo 1 usuário").max(100, "Máximo 100 usuários"),
  max_professionals: z.coerce.number().min(1, "Mínimo 1 profissional").max(100, "Máximo 100 profissionais"),
  max_contacts: z.coerce.number().min(100, "Mínimo 100 contatos").max(100000, "Máximo 100.000 contatos"),
  max_whatsapp_numbers: z.coerce.number().min(1, "Mínimo 1 WhatsApp").max(10, "Máximo 10 WhatsApp"),
  max_ai_tokens: z.coerce.number().min(5000000, "Mínimo 5M tokens").max(100000000, "Máximo 100M tokens"),
  reason: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface EditLimitsDialogProps {
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditLimitsDialog = ({ companyId, open, onOpenChange }: EditLimitsDialogProps) => {
  const { data: subscription, isLoading } = useSubscriptionDetails(companyId);
  const updateLimits = useUpdateLimits();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      max_users: 2,
      max_professionals: 3,
      max_contacts: 1000,
      max_whatsapp_numbers: 1,
      max_ai_tokens: 5000000,
      reason: "",
    },
  });

  useEffect(() => {
    if (subscription) {
      form.reset({
        max_users: subscription.max_users,
        max_professionals: subscription.max_professionals,
        max_contacts: subscription.max_contacts,
        max_whatsapp_numbers: subscription.max_whatsapp_numbers,
        max_ai_tokens: subscription.max_ai_tokens,
        reason: "",
      });
    }
  }, [subscription, form]);

  const onSubmit = async (data: FormData) => {
    await updateLimits.mutateAsync({
      companyId,
      limits: data,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Editar Limites de Recursos</DialogTitle>
          <DialogDescription>
            Ajuste os limites de recursos para {subscription?.companies?.name}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="max_users"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Máximo de Usuários</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Atual: {subscription?.current_users || 0} em uso
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="max_professionals"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Máximo de Profissionais</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Atual: {subscription?.current_professionals || 0} em uso
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="max_contacts"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Máximo de Contatos</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Atual: {subscription?.current_contacts || 0} em uso
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="max_whatsapp_numbers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Máximo de WhatsApp</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Atual: {subscription?.current_whatsapp_numbers || 0} em uso
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="max_ai_tokens"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Máximo de Tokens IA</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Atual: {subscription?.current_ai_tokens || 0} em uso (múltiplos de 5M)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivo da Alteração (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ex: Cliente solicitou aumento de limite"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateLimits.isPending}>
                  {updateLimits.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Salvar Alterações
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};

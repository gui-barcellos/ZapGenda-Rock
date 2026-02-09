import { useState } from "react";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { useZAPISettings } from "@/hooks/useZAPISettings";

const formSchema = z.object({
  clientToken: z.string().min(1, "Client Token é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

interface ManageZAPIClientTokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ManageZAPIClientTokenDialog = ({
  open,
  onOpenChange,
}: ManageZAPIClientTokenDialogProps) => {
  const { updateToken } = useZAPISettings();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientToken: "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      await updateToken.mutateAsync({
        clientToken: values.clientToken.trim(),
        password: values.password,
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      // Error já é tratado no hook
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configurar Client Token Z-API</DialogTitle>
          <DialogDescription>
            Insira o Client Token global da sua conta Z-API. Este token será usado por todas as instâncias configuradas no sistema.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="clientToken"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Token</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Cole o Client Token aqui"
                      {...field}
                      autoComplete="off"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sua Senha (para confirmar)</FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder="Digite sua senha"
                      {...field}
                      autoComplete="current-password"
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
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : "Salvar Token"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

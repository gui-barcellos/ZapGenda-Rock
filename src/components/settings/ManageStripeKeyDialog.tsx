import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { useStripeSettings } from "@/hooks/useStripeSettings";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  apiKey: z
    .string()
    .min(1, "A chave do Stripe é obrigatória")
    .refine(
      (key) => key.startsWith("sk_test_") || key.startsWith("sk_live_"),
      "Chave inválida. Deve começar com 'sk_test_' ou 'sk_live_'"
    ),
  password: z.string().min(1, "A senha é obrigatória"),
});

type FormData = z.infer<typeof formSchema>;

interface ManageStripeKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageStripeKeyDialog({ open, onOpenChange }: ManageStripeKeyDialogProps) {
  const { updateKey } = useStripeSettings();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      await updateKey.mutateAsync({
        newKey: data.apiKey,
        password: data.password,
      });
      reset();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Gerenciar Chave Stripe</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">Nova Chave Stripe</Label>
            <Input
              id="apiKey"
              type="text"
              placeholder="sk_test_... ou sk_live_..."
              {...register("apiKey")}
              className="font-mono"
            />
            {errors.apiKey && (
              <p className="text-sm text-destructive">{errors.apiKey.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Use sk_test_ para testes ou sk_live_ para produção
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Sua Senha</Label>
            <PasswordInput
              id="password"
              placeholder="Digite sua senha para confirmar"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

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
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Chave
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

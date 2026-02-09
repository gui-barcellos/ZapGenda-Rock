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
import { useOpenAISettings } from "@/hooks/useOpenAISettings";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  apiKey: z.string().min(1, "A chave da OpenAI é obrigatória").startsWith("sk-", "Chave inválida"),
  password: z.string().min(1, "A senha é obrigatória"),
});

type FormData = z.infer<typeof formSchema>;

interface ManageOpenAIKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageOpenAIKeyDialog({ open, onOpenChange }: ManageOpenAIKeyDialogProps) {
  const { updateKey } = useOpenAISettings();
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
          <DialogTitle>Gerenciar Chave OpenAI</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">Nova Chave OpenAI</Label>
            <Input
              id="apiKey"
              type="text"
              placeholder="sk-..."
              {...register("apiKey")}
              className="font-mono"
            />
            {errors.apiKey && (
              <p className="text-sm text-destructive">{errors.apiKey.message}</p>
            )}
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

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Loader2 } from "lucide-react";
import { useSupabaseSettings } from "@/hooks/useSupabaseSettings";

const formSchema = z.object({
  projectId: z.string().min(1, "Project ID obrigatorio"),
  projectUrl: z
    .string()
    .min(1, "Project URL obrigatorio")
    .refine((value) => value.startsWith("https://") && value.includes(".supabase.co"), {
      message: "Project URL deve ser https://...supabase.co",
    }),
  publishableKey: z.string().min(1, "Publishable key obrigatoria"),
  accessToken: z.string().optional(),
  password: z.string().min(1, "A senha e obrigatoria"),
});

type FormData = z.infer<typeof formSchema>;

interface ManageSupabaseSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues: {
    projectId: string;
    projectUrl: string;
    publishableKey: string;
    accessToken: string;
  };
}

export function ManageSupabaseSettingsDialog({
  open,
  onOpenChange,
  initialValues,
}: ManageSupabaseSettingsDialogProps) {
  const { updateSettings } = useSupabaseSettings();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectId: initialValues.projectId,
      projectUrl: initialValues.projectUrl,
      publishableKey: initialValues.publishableKey,
      accessToken: initialValues.accessToken,
      password: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      projectId: initialValues.projectId,
      projectUrl: initialValues.projectUrl,
      publishableKey: initialValues.publishableKey,
      accessToken: initialValues.accessToken,
      password: "",
    });
  }, [open, initialValues, reset]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      await updateSettings.mutateAsync({
        projectId: data.projectId,
        projectUrl: data.projectUrl,
        publishableKey: data.publishableKey,
        accessToken: data.accessToken,
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
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Gerenciar Supabase</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="projectId">Project ID</Label>
            <Input id="projectId" type="text" {...register("projectId")} className="font-mono" />
            {errors.projectId && (
              <p className="text-sm text-destructive">{errors.projectId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="projectUrl">Project URL</Label>
            <Input id="projectUrl" type="text" {...register("projectUrl")} className="font-mono" />
            {errors.projectUrl && (
              <p className="text-sm text-destructive">{errors.projectUrl.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="publishableKey">Publishable Key</Label>
            <Input id="publishableKey" type="text" {...register("publishableKey")} className="font-mono" />
            {errors.publishableKey && (
              <p className="text-sm text-destructive">{errors.publishableKey.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="accessToken">Supabase Access Token</Label>
            <PasswordInput
              id="accessToken"
              placeholder="Cole o token (opcional)"
              {...register("accessToken")}
            />
            <p className="text-xs text-muted-foreground">
              Necessario para deploy via CLI. Se vazio, mantera o token atual.
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
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useCreatePlanTemplate, useUpdatePlanTemplate, PlanTemplate } from "@/hooks/useSubscriptions";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").max(50, "Nome muito longo"),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

interface PlanTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: PlanTemplate | null;
}

export const PlanTemplateDialog = ({ open, onOpenChange, template }: PlanTemplateDialogProps) => {
  const createTemplate = useCreatePlanTemplate();
  const updateTemplate = useUpdatePlanTemplate();
  const isEditing = !!template;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (template) {
      form.reset({
        name: template.name,
        is_active: template.is_active,
      });
    } else {
      form.reset({
        name: "",
        is_active: true,
      });
    }
  }, [template, form]);

  const onSubmit = async (data: FormData) => {
    if (isEditing && template?.id) {
      await updateTemplate.mutateAsync({
        id: template.id,
        template: data,
      });
    } else {
      await createTemplate.mutateAsync(data as PlanTemplate);
    }
    onOpenChange(false);
  };

  const isPending = createTemplate.isPending || updateTemplate.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Template" : "Criar Novo Template"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Atualize as informações do template de plano"
              : "Crie um novo template de plano para facilitar a gestão de assinaturas"
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Plano</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Básico, Profissional, Enterprise" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Template Ativo</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Templates ativos podem ser aplicados a empresas
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
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
              <Button type="submit" disabled={isPending}>
                {isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? "Atualizar" : "Criar"} Template
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

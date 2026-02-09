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
import { useUpdateResourcePrices, ResourcePrice } from "@/hooks/useSubscriptions";
import { Loader2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const formSchema = z.object({
  base_plan: z.coerce.number().min(0, "Preço deve ser >= 0"),
  user: z.coerce.number().min(0, "Preço deve ser >= 0"),
  professional: z.coerce.number().min(0, "Preço deve ser >= 0"),
  whatsapp: z.coerce.number().min(0, "Preço deve ser >= 0"),
  contacts_1k: z.coerce.number().min(0, "Preço deve ser >= 0"),
});

type FormData = z.infer<typeof formSchema>;

const RESOURCE_LABELS: Record<string, string> = {
  base_plan: "Plano Base",
  user: "Usuário Extra",
  professional: "Profissional Extra",
  whatsapp: "WhatsApp Extra",
  contacts_1k: "1.000 Contatos",
};

interface EditPricesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPrices: ResourcePrice[];
}

export const EditPricesDialog = ({ open, onOpenChange, currentPrices }: EditPricesDialogProps) => {
  const updatePrices = useUpdateResourcePrices();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      base_plan: 0,
      user: 0,
      professional: 0,
      whatsapp: 0,
      contacts_1k: 0,
    },
  });

  useEffect(() => {
    if (currentPrices.length > 0) {
      const priceMap = currentPrices.reduce((acc, price) => {
        acc[price.resource_type] = Number(price.monthly_price);
        return acc;
      }, {} as Record<string, number>);

      form.reset(priceMap as FormData);
    }
  }, [currentPrices, form]);

  const onSubmit = async (data: FormData) => {
    const updatedPrices: ResourcePrice[] = Object.entries(data).map(([resource_type, monthly_price]) => {
      const existing = currentPrices.find(p => p.resource_type === resource_type);
      return {
        id: existing?.id || '',
        resource_type,
        monthly_price: Number(monthly_price),
      };
    });

    await updatePrices.mutateAsync(updatedPrices);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Preços de Recursos</DialogTitle>
          <DialogDescription>
            Atualize os preços mensais de cada recurso
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Alterar os preços afetará o cálculo de futuras faturas, mas não afetará empresas com preços já calculados no ciclo atual.
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {Object.entries(RESOURCE_LABELS).map(([key, label]) => (
              <FormField
                key={key}
                control={form.control}
                name={key as keyof FormData}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          R$
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          className="pl-10"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={updatePrices.isPending}>
                {updatePrices.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Salvar Preços
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

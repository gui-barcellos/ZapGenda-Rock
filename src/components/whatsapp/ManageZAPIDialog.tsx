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
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useSuperUserZAPI, useValidateZAPIConnection } from "@/hooks/useSuperUserZAPI";
import { WebhookURLDisplay } from "./WebhookURLDisplay";

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  z_api_instance_id: z.string().min(1, "ID da Instância é obrigatório"),
  z_api_token: z.string().min(1, "Token da Instância é obrigatório"),
  z_api_client_token: z.string().optional(),
});

interface ManageZAPIDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  companyName: string;
  existingConnection?: {
    id: string;
    name: string | null;
    phone: string | null;
    z_api_instance_id: string;
    z_api_token: string;
    z_api_client_token: string;
    is_connected: boolean;
  } | null;
}

export const ManageZAPIDialog = ({
  open,
  onOpenChange,
  companyId,
  companyName,
  existingConnection,
}: ManageZAPIDialogProps) => {
  const [validationStatus, setValidationStatus] = useState<
    "idle" | "validating" | "success" | "error"
  >("idle");
  const [validationPhone, setValidationPhone] = useState<string | null>(null);

  const { createConnection, updateConnection } = useSuperUserZAPI();
  const validateConnection = useValidateZAPIConnection();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: existingConnection?.name || "",
      z_api_instance_id: existingConnection?.z_api_instance_id || "",
      z_api_token: existingConnection?.z_api_token || "",
      z_api_client_token: existingConnection?.z_api_client_token || "",
    },
  });

  const handleValidate = async () => {
    const values = form.getValues();
    setValidationStatus("validating");

    try {
      const result = await validateConnection.mutateAsync({
        instanceId: values.z_api_instance_id,
        token: values.z_api_token,
        clientToken: values.z_api_client_token,
      });

      if (result.connected) {
        setValidationStatus("success");
        setValidationPhone(result.phone || null);
      } else {
        setValidationStatus("error");
      }
    } catch (error) {
      setValidationStatus("error");
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (validationStatus !== "success") {
      return;
    }

    const connectionData = {
      ...values,
      phone: validationPhone,
      is_connected: true,
      is_primary: true,
    };

    if (existingConnection) {
      await updateConnection.mutateAsync({
        id: existingConnection.id,
        companyId,
        data: connectionData,
      });
    } else {
      await createConnection.mutateAsync({
        companyId,
        data: connectionData,
      });
    }

    onOpenChange(false);
    form.reset();
    setValidationStatus("idle");
    setValidationPhone(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {existingConnection ? "Editar" : "Configurar"} Z-API
          </DialogTitle>
          <DialogDescription>
            Gerencie a conexão Z-API da empresa <strong>{companyName}</strong>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Conexão</FormLabel>
                  <FormControl>
                    <Input placeholder="WhatsApp Principal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="z_api_instance_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID da Instância</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="3EA0BAA9C127B19E347D262C2401B26D"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Copie da página da instância no Z-API
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="z_api_token"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Token da Instância</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="E7A5B1E66FAFC97CF5247879" {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Copie da página da instância no Z-API
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="z_api_client_token"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Token (Opcional - Recomendado)</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Deixe em branco se não quiser usar"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Camada adicional de segurança. Disponível em{" "}
                    <a 
                      href="https://app.z-api.io/app/security" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      app.z-api.io/app/security
                    </a>
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="mt-4">
              <WebhookURLDisplay />
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleValidate}
                disabled={
                  validationStatus === "validating" ||
                  !form.formState.isValid
                }
                className="flex-1"
              >
                {validationStatus === "validating" && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Testar Conexão
              </Button>

              {validationStatus === "success" && (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Conectado
                </Badge>
              )}
              {validationStatus === "error" && (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  Erro
                </Badge>
              )}
            </div>

            {validationPhone && (
              <div className="text-sm text-muted-foreground">
                Número: <span className="font-medium">{validationPhone}</span>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={
                  validationStatus !== "success" ||
                  createConnection.isPending ||
                  updateConnection.isPending
                }
              >
                {(createConnection.isPending || updateConnection.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

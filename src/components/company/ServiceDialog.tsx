import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useServices } from "@/hooks/useServices";
import { useProfessionals } from "@/hooks/useProfessionals";
import { useServiceProfessionals } from "@/hooks/useServiceProfessionals";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
  color: string;
  is_active: boolean;
  description?: string;
}

interface ServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: Service | null;
  onSuccess: () => void;
}

export function ServiceDialog({ open, onOpenChange, service, onSuccess }: ServiceDialogProps) {
  const [name, setName] = useState("");
  const [duration, setDuration] = useState(60);
  const [price, setPrice] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [description, setDescription] = useState("");
  const [selectedProfessionals, setSelectedProfessionals] = useState<string[]>([]);

  const { createService, updateService } = useServices();
  const { professionals } = useProfessionals();
  const { linkProfessionals } = useServiceProfessionals();

  useEffect(() => {
    const loadData = async () => {
      if (service) {
        setName(service.name);
        setDuration(service.duration);
        setPrice(service.price.toString());
        setIsActive(service.is_active);
        setDescription(service.description || "");
        
        // Carregar profissionais vinculados
        const { data } = await supabase
          .from("service_professionals")
          .select("professional_id")
          .eq("service_id", service.id);
        
        setSelectedProfessionals(data?.map(sp => sp.professional_id) || []);
      } else {
        setName("");
        setDuration(60);
        setPrice("");
        setIsActive(true);
        setDescription("");
        setSelectedProfessionals([]);
      }
    };

    if (open) {
      loadData();
    }
  }, [service, open]);

  const handleProfessionalToggle = (professionalId: string, checked: boolean) => {
    if (checked) {
      setSelectedProfessionals([...selectedProfessionals, professionalId]);
    } else {
      setSelectedProfessionals(selectedProfessionals.filter(id => id !== professionalId));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const shouldBeActive = selectedProfessionals.length > 0 && isActive;

    try {
      if (service) {
        // Atualizar serviço
        await updateService.mutateAsync({
          id: service.id,
          name,
          duration,
          price: parseFloat(price),
          color: "#10b981",
          description,
          isActive: shouldBeActive,
        });

        // Atualizar vínculos de profissionais
        await linkProfessionals.mutateAsync({
          serviceId: service.id,
          professionalIds: selectedProfessionals,
        });
      } else {
        // Criar serviço
        const { data: profile } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("id", (await supabase.auth.getUser()).data.user?.id)
          .single();

        if (!profile?.company_id) {
          toast.error("Empresa não encontrada");
          return;
        }

        const { data: newService, error } = await supabase
          .from("services")
          .insert({
            company_id: profile.company_id,
            name,
            duration,
            price: parseFloat(price),
            color: "#10b981",
            description,
            is_active: shouldBeActive,
          })
          .select()
          .single();

        if (error) throw error;

        // Vincular profissionais
        if (newService && selectedProfessionals.length > 0) {
          await linkProfessionals.mutateAsync({
            serviceId: newService.id,
            professionalIds: selectedProfessionals,
          });
        }

        toast.success(
          shouldBeActive 
            ? "Serviço adicionado" 
            : "Serviço criado como DESATIVADO (sem profissionais vinculados)"
        );
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const activeProfessionals = professionals?.filter(p => p.is_active) || [];
  const showInactiveWarning = selectedProfessionals.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{service ? "Editar Serviço" : "Adicionar Serviço"}</DialogTitle>
          <DialogDescription>
            {service ? "Atualize as informações do serviço" : "Cadastre um novo serviço oferecido"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Serviço *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Consulta, Avaliação, etc."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o serviço oferecido"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Profissionais vinculados (opcional)</Label>
              <ScrollArea className="h-32 border rounded-md p-3">
                <div className="space-y-2">
                  {activeProfessionals.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum profissional ativo disponível</p>
                  ) : (
                    activeProfessionals.map((prof) => (
                      <div key={prof.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`prof-${prof.id}`}
                          checked={selectedProfessionals.includes(prof.id)}
                          onCheckedChange={(checked) => handleProfessionalToggle(prof.id, checked as boolean)}
                        />
                        <label
                          htmlFor={`prof-${prof.id}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {prof.name} {prof.specialty && `- ${prof.specialty}`}
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
              {showInactiveWarning && (
                <Alert variant="destructive" className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Serviço será criado DESATIVADO (sem profissionais vinculados)
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duração (minutos) *</Label>
              <Input
                id="duration"
                type="number"
                min="15"
                step="15"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                required
              />
              <p className="text-sm text-muted-foreground">Incremento de 15 minutos</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Preço (R$)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Status Ativo</Label>
                <Switch 
                  id="is_active" 
                  checked={isActive} 
                  onCheckedChange={setIsActive}
                  disabled={selectedProfessionals.length === 0}
                />
              </div>
              {selectedProfessionals.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Desativado automaticamente (sem profissionais vinculados)
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createService.isPending || updateService.isPending}>
                {createService.isPending || updateService.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

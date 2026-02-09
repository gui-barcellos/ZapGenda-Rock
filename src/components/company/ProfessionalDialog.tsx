import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Trash2 } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useProfessionals } from "@/hooks/useProfessionals";

interface Professional {
  id: string;
  name: string;
  specialty?: string;
  color: string;
  photo_url?: string;
  is_active: boolean;
}

interface ProfessionalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professional?: Professional | null;
  onSuccess: () => void;
}

export function ProfessionalDialog({ open, onOpenChange, professional, onSuccess }: ProfessionalDialogProps) {
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { createProfessional, updateProfessional, deleteProfessional } = useProfessionals();

  useEffect(() => {
    if (professional) {
      setName(professional.name);
      setSpecialty(professional.specialty || "");
      setIsActive(professional.is_active);
    } else {
      setName("");
      setSpecialty("");
      setIsActive(true);
    }
  }, [professional, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (professional) {
      await updateProfessional.mutateAsync({
        id: professional.id,
        name,
        specialty,
        isActive,
      });
    } else {
      await createProfessional.mutateAsync({
        name,
        specialty,
      });
    }

    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{professional ? "Editar Profissional" : "Adicionar Profissional"}</DialogTitle>
          <DialogDescription>
            {professional
              ? "Atualize as informações do profissional"
              : "Cadastre um novo profissional na sua equipe"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do profissional"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialty">Especialidade</Label>
            <Input
              id="specialty"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder="Ex: Psicólogo, Dentista, etc."
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_active">Status Ativo</Label>
            <Switch id="is_active" checked={isActive} onCheckedChange={setIsActive} />
          </div>

          {professional && (
            <div className="border-t pt-4">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Profissional
              </Button>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createProfessional.isPending || updateProfessional.isPending}
            >
              {createProfessional.isPending || updateProfessional.isPending
                ? "Salvando..."
                : "Salvar"}
            </Button>
          </div>
        </form>

        <DeleteConfirmDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          onConfirm={async () => {
            if (professional) {
              await deleteProfessional.mutateAsync(professional.id);
              onSuccess();
              onOpenChange(false);
            }
          }}
          title="Excluir Profissional"
          description="Tem certeza que deseja excluir este profissional? Esta ação não pode ser desfeita. Serviços vinculados a este profissional podem ser desativados."
          isLoading={deleteProfessional.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}

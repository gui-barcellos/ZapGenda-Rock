import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PasswordInput } from "@/components/ui/password-input";
import { useCompanyUsers } from "@/hooks/useCompanyUsers";

interface User {
  id: string;
  full_name: string;
  role: string;
}

interface EditUserRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  onSuccess: () => void;
}

export function EditUserRoleDialog({ open, onOpenChange, user, onSuccess }: EditUserRoleDialogProps) {
  const [newRole, setNewRole] = useState<"admin" | "attendant">(user.role as "admin" | "attendant");
  const [password, setPassword] = useState("");
  const { updateUserRole } = useCompanyUsers();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    updateUserRole.mutate(
      { userId: user.id, newRole, password },
      {
        onSuccess: () => {
          setPassword("");
          onOpenChange(false);
          onSuccess();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar Permissão de {user.full_name}</DialogTitle>
          <DialogDescription>
            Altere a permissão do usuário. Esta ação requer confirmação de senha.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role">Nova Permissão</Label>
            <Select value={newRole} onValueChange={(value: "admin" | "attendant") => setNewRole(value)}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="attendant">Atendente</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Sua Senha (para confirmar)</Label>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateUserRole.isPending}>
              {updateUserRole.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { useRenameTag, useTagUsageCount } from "@/hooks/useTagManagement";

interface RenameTagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tagName: string;
}

export function RenameTagDialog({
  open,
  onOpenChange,
  tagName,
}: RenameTagDialogProps) {
  const [newName, setNewName] = useState("");
  const renameTag = useRenameTag();
  const { data: usageCount } = useTagUsageCount(tagName);

  const handleRename = async () => {
    if (!newName.trim() || newName === tagName) return;

    await renameTag.mutateAsync({
      oldName: tagName,
      newName: newName.trim(),
    });

    onOpenChange(false);
    setNewName("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renomear Tag</DialogTitle>
          <DialogDescription>
            Esta ação irá renomear a tag em todos os contatos que a utilizam.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome Atual</Label>
            <Input value={tagName} disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-name">Novo Nome *</Label>
            <Input
              id="new-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Digite o novo nome da tag"
              maxLength={50}
            />
          </div>

          {usageCount !== undefined && usageCount > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Esta tag está sendo usada em {usageCount} contato(s). Todos
                serão atualizados.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setNewName("");
            }}
            disabled={renameTag.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleRename}
            disabled={!newName.trim() || newName === tagName || renameTag.isPending}
          >
            {renameTag.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Renomear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

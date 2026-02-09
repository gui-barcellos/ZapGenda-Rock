import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useDeleteTag, useTagUsageCount } from "@/hooks/useTagManagement";

interface DeleteTagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tagName: string;
}

export function DeleteTagDialog({
  open,
  onOpenChange,
  tagName,
}: DeleteTagDialogProps) {
  const [confirmed, setConfirmed] = useState(false);
  const deleteTag = useDeleteTag();
  const { data: usageCount } = useTagUsageCount(tagName);

  const handleDelete = async () => {
    if (!confirmed) return;

    await deleteTag.mutateAsync(tagName);
    onOpenChange(false);
    setConfirmed(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    setConfirmed(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Deletar Tag Permanentemente
          </AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. A tag "{tagName}" será removida de
            todos os contatos.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {usageCount !== undefined && usageCount > 0 && (
            <Alert variant="destructive">
              <AlertDescription>
                Esta tag está sendo usada em {usageCount} contato(s). Todos
                perderão esta tag.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-start space-x-2">
            <Checkbox
              id="confirm-delete"
              checked={confirmed}
              onCheckedChange={(checked) => setConfirmed(checked === true)}
            />
            <label
              htmlFor="confirm-delete"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Tenho certeza que desejo remover esta tag de todos os contatos
            </label>
          </div>
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={deleteTag.isPending}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!confirmed || deleteTag.isPending}
          >
            {deleteTag.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Deletar Permanentemente
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Loader2 } from "lucide-react";
import { useTagRegistry } from "@/hooks/useTagManagement";
import { useBulkAddTags, useBulkRemoveTags } from "@/hooks/useBulkTags";
import { TagBadge } from "./TagBadge";

interface BulkTagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedContactIds: string[];
  onSuccess: () => void;
}

export function BulkTagDialog({
  open,
  onOpenChange,
  selectedContactIds,
  onSuccess,
}: BulkTagDialogProps) {
  const [tagsToAdd, setTagsToAdd] = useState<string[]>([]);
  const [tagsToRemove, setTagsToRemove] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"add" | "remove">("add");

  const { data: registry } = useTagRegistry();
  const bulkAddTags = useBulkAddTags();
  const bulkRemoveTags = useBulkRemoveTags();

  const handleApply = async () => {
    if (activeTab === "add" && tagsToAdd.length > 0) {
      await bulkAddTags.mutateAsync({
        contactIds: selectedContactIds,
        tags: tagsToAdd,
      });
    } else if (activeTab === "remove" && tagsToRemove.length > 0) {
      await bulkRemoveTags.mutateAsync({
        contactIds: selectedContactIds,
        tags: tagsToRemove,
      });
    }

    setTagsToAdd([]);
    setTagsToRemove([]);
    onSuccess();
    onOpenChange(false);
  };

  const toggleAddTag = (tag: string) => {
    setTagsToAdd((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const toggleRemoveTag = (tag: string) => {
    setTagsToRemove((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const isApplying = bulkAddTags.isPending || bulkRemoveTags.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Operação em Massa de Tags</DialogTitle>
          <DialogDescription>
            {selectedContactIds.length} contato(s) selecionado(s)
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="add">Adicionar Tags</TabsTrigger>
            <TabsTrigger value="remove">Remover Tags</TabsTrigger>
          </TabsList>

          <TabsContent value="add" className="space-y-4 mt-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Selecione as tags que deseja adicionar a {selectedContactIds.length}{" "}
                contato(s)
              </AlertDescription>
            </Alert>

            <ScrollArea className="h-[300px] border rounded-lg p-4">
              {registry && registry.length > 0 ? (
                <div className="space-y-2">
                  {registry.map((tag) => (
                    <div
                      key={tag.id}
                      className="flex items-center space-x-3 p-2 hover:bg-muted rounded"
                    >
                      <Checkbox
                        id={`add-${tag.id}`}
                        checked={tagsToAdd.includes(tag.name)}
                        onCheckedChange={() => toggleAddTag(tag.name)}
                      />
                      <label
                        htmlFor={`add-${tag.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        <TagBadge tag={tag.name} />
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma tag disponível. Crie tags primeiro.
                </p>
              )}
            </ScrollArea>

            {tagsToAdd.length > 0 && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Preview:</p>
                <p className="text-sm text-muted-foreground">
                  Adicionar {tagsToAdd.length} tag(s) a{" "}
                  {selectedContactIds.length} contato(s)
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="remove" className="space-y-4 mt-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Selecione as tags que deseja remover de {selectedContactIds.length}{" "}
                contato(s)
              </AlertDescription>
            </Alert>

            <ScrollArea className="h-[300px] border rounded-lg p-4">
              {registry && registry.length > 0 ? (
                <div className="space-y-2">
                  {registry.map((tag) => (
                    <div
                      key={tag.id}
                      className="flex items-center space-x-3 p-2 hover:bg-muted rounded"
                    >
                      <Checkbox
                        id={`remove-${tag.id}`}
                        checked={tagsToRemove.includes(tag.name)}
                        onCheckedChange={() => toggleRemoveTag(tag.name)}
                      />
                      <label
                        htmlFor={`remove-${tag.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        <TagBadge tag={tag.name} />
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma tag disponível.
                </p>
              )}
            </ScrollArea>

            {tagsToRemove.length > 0 && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Preview:</p>
                <p className="text-sm text-muted-foreground">
                  Remover {tagsToRemove.length} tag(s) de{" "}
                  {selectedContactIds.length} contato(s)
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isApplying}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleApply}
            disabled={
              isApplying ||
              (activeTab === "add" && tagsToAdd.length === 0) ||
              (activeTab === "remove" && tagsToRemove.length === 0)
            }
          >
            {isApplying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTagRegistry } from "@/hooks/useTagManagement";
import { TagBadge } from "./TagBadge";
import { Loader2, Plus, Edit, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
interface TagRegistry {
  id: string;
  name: string;
  color?: string;
  category?: string;
  description?: string;
  show_in_chat?: boolean;
  is_system_tag?: boolean;
  is_editable?: boolean;
}
interface TagManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateTag: () => void;
  onEditTag: (tag: TagRegistry) => void;
}
export function TagManagementDialog({
  open,
  onOpenChange,
  onCreateTag,
  onEditTag
}: TagManagementDialogProps) {
  const {
    data: tags,
    isLoading
  } = useTagRegistry();
  const handleTagClick = (tag: TagRegistry) => {
    if (tag.is_system_tag || !tag.is_editable) {
      toast.error("Esta tag não pode ser editada");
      return;
    }
    onEditTag(tag);
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Gerenciar Tags</DialogTitle>
            <Button onClick={onCreateTag} size="sm" className="my-0 mx-[15px]">
              <Plus className="mr-2 h-4 w-4" />
              Nova Tag
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {isLoading ? <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div> : tags && tags.length > 0 ? <div className="space-y-2">
              {tags.map(tag => <div key={tag.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors" onClick={() => handleTagClick(tag)}>
                  <div className="flex items-center gap-3 flex-1">
                    <TagBadge tag={tag.name} />
                    <div className="text-sm flex-1">
                      {tag.category && <span className="text-muted-foreground">
                          {tag.category}
                        </span>}
                      {tag.description && <p className="text-xs text-muted-foreground mt-1">
                          {tag.description}
                        </p>}
                    </div>
                  </div>
                  
                  {tag.is_editable && !tag.is_system_tag && <Badge variant="outline" className="text-xs">
                      <Edit className="h-3 w-3 mr-1" />
                      Clique para editar
                    </Badge>}
                  
                  {(tag.is_system_tag || !tag.is_editable) && <Badge variant="secondary" className="text-xs">
                      <Lock className="h-3 w-3 mr-1" />
                      Não editável
                    </Badge>}
                </div>)}
            </div> : <p className="text-center text-muted-foreground py-8">
              Nenhuma tag no registro ainda. Clique em "Nova Tag" para criar.
            </p>}
        </div>
      </DialogContent>
    </Dialog>;
}
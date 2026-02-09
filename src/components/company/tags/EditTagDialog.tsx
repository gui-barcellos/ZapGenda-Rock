import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TagColorPicker } from "./TagColorPicker";
import { useCreateTagInRegistry, useUpdateTagMetadata, useRenameTag, useTagUsageCount } from "@/hooks/useTagManagement";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

interface EditTagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  tagData?: TagRegistry;
}

export function EditTagDialog({
  open,
  onOpenChange,
  mode,
  tagData,
}: EditTagDialogProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [showInChat, setShowInChat] = useState(false);

  const createTag = useCreateTagInRegistry();
  const updateTag = useUpdateTagMetadata();
  const renameTag = useRenameTag();
  const { data: usageCount } = useTagUsageCount(tagData?.name || "");

  // Pré-preencher form quando mode = 'edit'
  useEffect(() => {
    if (mode === 'edit' && tagData) {
      setName(tagData.name);
      setColor(tagData.color || "#3b82f6");
      setCategory(tagData.category || "");
      setDescription(tagData.description || "");
      setShowInChat(tagData.show_in_chat || false);
    } else {
      // Reset para modo create
      setName("");
      setColor("#3b82f6");
      setCategory("Personalizada");
      setDescription("");
      setShowInChat(false);
    }
  }, [mode, tagData, open]);

  const handleSave = async () => {
    if (!name.trim()) return;

    try {
      if (mode === 'edit' && tagData?.id) {
        // Se o nome mudou, fazer renomeação primeiro
        if (name !== tagData.name) {
          await renameTag.mutateAsync({
            oldName: tagData.name,
            newName: name.trim(),
          });
        }
        
        // Depois atualizar os outros metadados
        await updateTag.mutateAsync({
          id: tagData.id,
          color,
          category: category === "none" ? undefined : category || undefined,
          description: description || undefined,
          show_in_chat: showInChat,
        });
      } else {
        await createTag.mutateAsync({
          name: name.trim(),
          color,
          category: category === "none" ? undefined : category || undefined,
          description: description || undefined,
          show_in_chat: showInChat,
        });
      }
      
      // Fechar modal após sucesso
      onOpenChange(false);
    } catch (error) {
      // Erros já são tratados pelos hooks
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Nova Tag' : 'Editar Tag'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="tag-name">Nome da Tag *</Label>
            <Input
              id="tag-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Cliente VIP"
              maxLength={50}
            />
            {mode === 'edit' && name !== tagData?.name && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Atenção:</strong> Alterar o nome irá renomear a tag em todos os {usageCount || 0} contato(s) que a utilizam.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <TagColorPicker value={color} onChange={setColor} />

          <div className="space-y-2">
            <Label htmlFor="tag-category">Categoria</Label>
            <Select value={category} onValueChange={setCategory} disabled={mode === 'create'}>
              <SelectTrigger id="tag-category">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                <SelectItem value="Sistema">Sistema</SelectItem>
                <SelectItem value="Atendimento">Atendimento</SelectItem>
                <SelectItem value="Origem">Origem</SelectItem>
                <SelectItem value="Agendamento">Agendamento</SelectItem>
                <SelectItem value="Personalizada">Personalizada</SelectItem>
              </SelectContent>
            </Select>
            {mode === 'create' && (
              <p className="text-xs text-muted-foreground">
                Tags personalizadas são automaticamente categorizadas como "Personalizada"
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="show-in-chat"
              checked={showInChat}
              onCheckedChange={(checked) => setShowInChat(checked as boolean)}
            />
            <Label htmlFor="show-in-chat" className="text-sm font-normal cursor-pointer">
              Exibir no Chat ao Vivo
              <p className="text-xs text-muted-foreground">
                Tags visíveis no chat ajudam atendentes a priorizarem conversas
              </p>
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tag-description">Descrição (opcional)</Label>
            <Textarea
              id="tag-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva quando usar esta tag..."
              rows={3}
              maxLength={200}
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={!name.trim() || createTag.isPending || updateTag.isPending || renameTag.isPending}
            className="w-full"
          >
            {(createTag.isPending || updateTag.isPending || renameTag.isPending) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {mode === 'create' ? 'Criar Tag' : 'Atualizar Tag'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

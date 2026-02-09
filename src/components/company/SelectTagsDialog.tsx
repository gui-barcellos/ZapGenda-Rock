import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTagRegistry } from "@/hooks/useTagManagement";
import { Tags, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SelectTagsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
}

export default function SelectTagsDialog({
  open,
  onOpenChange,
  selectedTags,
  onTagToggle,
}: SelectTagsDialogProps) {
  const { data: tags = [] } = useTagRegistry();

  // Group tags by category
  const tagsByCategory = tags.reduce((acc, tag) => {
    const category = tag.category || "Sem Categoria";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(tag);
    return acc;
  }, {} as Record<string, typeof tags>);

  const categories = Object.keys(tagsByCategory).sort();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tags className="h-5 w-5" />
            Selecionar Tags
          </DialogTitle>
        </DialogHeader>

        {categories.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <p>Nenhuma tag cadastrada</p>
            <p className="text-sm mt-2">Cadastre tags no menu Configurações → Tags</p>
          </div>
        ) : (
          <Tabs defaultValue={categories[0]} className="w-full">
            <TabsList className="w-full flex-wrap h-auto">
              {categories.map((category) => (
                <TabsTrigger key={category} value={category} className="flex-1 min-w-[120px]">
                  {category}
                  <Badge variant="secondary" className="ml-2">
                    {tagsByCategory[category].length}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            {categories.map((category) => (
              <TabsContent key={category} value={category} className="mt-4">
                <ScrollArea className="h-[400px] pr-4">
                  <div className="flex flex-wrap gap-2">
                    {tagsByCategory[category].map((tag) => {
                      const isSelected = selectedTags.includes(tag.name);
                      return (
                        <Badge
                          key={tag.id}
                          variant={isSelected ? "default" : "outline"}
                          className="cursor-pointer hover:bg-secondary transition-colors py-2 px-3 text-sm"
                          style={{
                            backgroundColor: isSelected ? tag.color : "transparent",
                            borderColor: tag.color,
                            color: isSelected ? "white" : tag.color,
                          }}
                          onClick={() => onTagToggle(tag.name)}
                        >
                          {tag.name}
                          {isSelected && <X className="ml-1 h-3 w-3" />}
                        </Badge>
                      );
                    })}
                  </div>
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>
        )}

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {selectedTags.length} {selectedTags.length === 1 ? "tag selecionada" : "tags selecionadas"}
          </div>
          <Button onClick={() => onOpenChange(false)}>
            Confirmar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

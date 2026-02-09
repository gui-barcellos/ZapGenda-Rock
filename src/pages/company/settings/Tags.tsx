import { useState } from "react";
import { useNavigate } from "react-router-dom";
import CompanyLayout from "@/components/layout/CompanyLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Eye, MoreVertical, Download, Lock, Zap, MessageSquare, Bell } from "lucide-react";
import { useTags } from "@/hooks/useTags";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TagBadge } from "@/components/company/tags/TagBadge";
import { TagManagementDialog } from "@/components/company/tags/TagManagementDialog";
import { EditTagDialog } from "@/components/company/tags/EditTagDialog";
import { RenameTagDialog } from "@/components/company/tags/RenameTagDialog";
import { DeleteTagDialog } from "@/components/company/tags/DeleteTagDialog";
import { useTagRegistry } from "@/hooks/useTagManagement";
import { useCreateDefaultTags } from "@/hooks/useDefaultTags";
import { useCompanySubscription } from "@/hooks/useCompanySubscription";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

const Tags = () => {
  const { tags, totalTags, totalContactsWithTags, mostUsedTag, isLoading } = useTags();
  const { data: tagRegistry, isLoading: isLoadingRegistry } = useTagRegistry();
  const { subscription } = useCompanySubscription();
  const createDefaultTags = useCreateDefaultTags();
  const [managementDialogOpen, setManagementDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState<'create' | 'edit'>('create');
  const [editingTag, setEditingTag] = useState<TagRegistry | undefined>();
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const navigate = useNavigate();

  const customTags = tagRegistry?.filter(t => !t.is_auto_generated) || [];
  const autoTags = tagRegistry?.filter(t => t.is_auto_generated) || [];
  const maxTags = subscription?.max_custom_tags || 50;

  const filteredTags = selectedCategory === "all" 
    ? tagRegistry 
    : tagRegistry?.filter(t => t.category === selectedCategory);

  const handleViewContacts = (tagName: string) => {
    navigate(`/company/contacts/patients?tag=${encodeURIComponent(tagName)}`);
  };

  const handleRename = (tagName: string) => {
    setSelectedTag(tagName);
    setRenameDialogOpen(true);
  };

  const handleDelete = (tagName: string) => {
    setSelectedTag(tagName);
    setDeleteDialogOpen(true);
  };

  const handleCreateTag = () => {
    setEditMode('create');
    setEditingTag(undefined);
    setEditDialogOpen(true);
  };

  const handleEditTag = (tag: TagRegistry) => {
    setEditMode('edit');
    setEditingTag(tag);
    setEditDialogOpen(true);
  };

  return (
    <CompanyLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tags de Contato</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie e organize as tags dos seus contatos
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => createDefaultTags.mutate()}
              disabled={createDefaultTags.isPending}
            >
              {createDefaultTags.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Importar Tags Sugeridas
            </Button>
            <Button onClick={() => setManagementDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Gerenciar Tags
            </Button>
          </div>
        </div>

        {/* Contador de Tags */}
        <Card>
          <CardHeader>
            <CardTitle>Limite de Tags Customizadas</CardTitle>
            <CardDescription>
              Você está usando {customTags.length} de {maxTags} tags customizadas disponíveis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={(customTags.length / maxTags) * 100} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {autoTags.length} tags automáticas (profissionais/serviços)
            </p>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTags}</div>
              <p className="text-xs text-muted-foreground">Tags únicas no sistema</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contatos com Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalContactsWithTags}</div>
              <p className="text-xs text-muted-foreground">Contatos organizados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tag Mais Usada</CardTitle>
            </CardHeader>
            <CardContent>
              {mostUsedTag ? (
                <>
                  <div className="text-2xl font-bold mb-1">{mostUsedTag.name}</div>
                  <p className="text-xs text-muted-foreground">
                    {mostUsedTag.count} contato(s)
                  </p>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">Nenhuma tag ainda</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Média por Contato</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalContactsWithTags > 0
                  ? (tags.reduce((sum, t) => sum + t.count, 0) / totalContactsWithTags).toFixed(1)
                  : "0"}
              </div>
              <p className="text-xs text-muted-foreground">Tags por contato</p>
            </CardContent>
          </Card>
        </div>

        {/* Tags List */}
        <Card>
          <CardHeader>
            <CardTitle>Tags Existentes</CardTitle>
            <CardDescription>
              Filtre por categoria e gerencie suas tags
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
              <TabsList className="grid w-full grid-cols-6 mb-4">
                <TabsTrigger value="all">Todas</TabsTrigger>
                <TabsTrigger value="Sistema">Sistema</TabsTrigger>
                <TabsTrigger value="Atendimento">Atendimento</TabsTrigger>
                <TabsTrigger value="Origem">Origem</TabsTrigger>
                <TabsTrigger value="Agendamento">Agendamento</TabsTrigger>
                <TabsTrigger value="Personalizada">Personalizada</TabsTrigger>
              </TabsList>

              <TabsContent value={selectedCategory}>
                {isLoadingRegistry ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                 ) : !filteredTags || filteredTags.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">
                      Nenhuma tag encontrada nesta categoria.
                    </p>
                  </div>
                 ) : (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {filteredTags.map((tag) => (
                      <Card key={tag.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <TagBadge tag={tag.name} />
                                {tag.is_system_tag && (
                                  <Badge variant="outline" className="text-xs">
                                    <Lock className="h-3 w-3 mr-1" />
                                    Sistema
                                  </Badge>
                                )}
                                {tag.is_auto_generated && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Zap className="h-3 w-3 mr-1" />
                                    Auto
                                  </Badge>
                                )}
                                {tag.show_in_chat && (
                                  <Badge variant="default" className="text-xs">
                                    <MessageSquare className="h-3 w-3 mr-1" />
                                    Chat
                                  </Badge>
                                )}
                                {tag.triggers_alert && (
                                  <Badge variant="destructive" className="text-xs">
                                    <Bell className="h-3 w-3 mr-1" />
                                    Alerta
                                  </Badge>
                                )}
                              </div>
                              {tag.category && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {tag.category}
                                </p>
                              )}
                              {tag.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {tag.description}
                                </p>
                              )}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewContacts(tag.name)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Ver Contatos
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => handleViewContacts(tag.name)}
                          >
                            <Eye className="mr-2 h-3 w-3" />
                            Ver Contatos
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <TagManagementDialog
        open={managementDialogOpen}
        onOpenChange={setManagementDialogOpen}
        onCreateTag={handleCreateTag}
        onEditTag={handleEditTag}
      />

      <EditTagDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        mode={editMode}
        tagData={editingTag}
      />

      <RenameTagDialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        tagName={selectedTag}
      />

      <DeleteTagDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        tagName={selectedTag}
      />
    </CompanyLayout>
  );
};

export default Tags;

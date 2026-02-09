import { CRMContact, useCRMHistory, useAddNote, useUpdateContactValue, useAssignContact } from "@/hooks/useCRM";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { useCompanyUsers } from "@/hooks/useCompanyUsers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CRMContactDetailsDialogProps {
  contact: CRMContact;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CRMContactDetailsDialog = ({
  contact,
  open,
  onOpenChange,
}: CRMContactDetailsDialogProps) => {
  const { data: history } = useCRMHistory(contact.id);
  const addNote = useAddNote();
  const updateValue = useUpdateContactValue();
  const assignContact = useAssignContact();
  const { users } = useCompanyUsers();

  const [newNote, setNewNote] = useState("");
  const [editingValue, setEditingValue] = useState(false);
  const [newValue, setNewValue] = useState(contact.estimated_value?.toString() || "");

  const handleAddNote = () => {
    if (newNote.trim()) {
      addNote.mutate({
        contactId: contact.id,
        companyId: contact.company_id!,
        notes: newNote,
      });
      setNewNote("");
    }
  };

  const handleUpdateValue = () => {
    const value = parseFloat(newValue);
    if (!isNaN(value)) {
      updateValue.mutate({
        contactId: contact.id,
        estimatedValue: value,
      });
      setEditingValue(false);
    }
  };

  const handleAssignContact = (userId: string) => {
    assignContact.mutate({
      contactId: contact.id,
      userId: userId === "none" ? null : userId,
    });
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      stage_changed: "Mudou de estágio",
      assigned: "Atribuído",
      value_updated: "Valor atualizado",
      note_added: "Nota adicionada",
    };
    return labels[action] || action;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{contact.name}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basics" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basics">Dados Básicos</TabsTrigger>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
            <TabsTrigger value="notes">Notas</TabsTrigger>
          </TabsList>

          <TabsContent value="basics" className="space-y-4">
            <Card className="p-4 space-y-3">
              <div>
                <Label>Nome</Label>
                <p className="text-sm mt-1">{contact.name}</p>
              </div>
              <div>
                <Label>Telefone</Label>
                <p className="text-sm mt-1">{contact.phone}</p>
              </div>
              {contact.email && (
                <div>
                  <Label>Email</Label>
                  <p className="text-sm mt-1">{contact.email}</p>
                </div>
              )}
              {contact.tags && contact.tags.length > 0 && (
                <div>
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {contact.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-primary/10 text-primary px-2 py-1 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="pipeline" className="space-y-4">
            <Card className="p-4 space-y-4">
              <div>
                <Label>Estágio Atual</Label>
                <p className="text-sm mt-1 capitalize">
                  {contact.funnel_stage.replace(/_/g, " ")}
                </p>
              </div>

              <div>
                <Label>Responsável</Label>
                <Select
                  value={contact.assigned_to_user_id || "none"}
                  onValueChange={handleAssignContact}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem responsável</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Valor Estimado</Label>
                {editingValue ? (
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="number"
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      placeholder="0.00"
                    />
                    <Button onClick={handleUpdateValue} size="sm">
                      Salvar
                    </Button>
                    <Button
                      onClick={() => {
                        setEditingValue(false);
                        setNewValue(contact.estimated_value?.toString() || "");
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm">
                      {contact.estimated_value
                        ? `R$ ${contact.estimated_value.toFixed(2)}`
                        : "Não definido"}
                    </p>
                    <Button onClick={() => setEditingValue(true)} variant="outline" size="sm">
                      Editar
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <Label>Fonte do Lead</Label>
                <p className="text-sm mt-1 capitalize">
                  {contact.lead_source?.replace(/_/g, " ") || "Não definida"}
                </p>
              </div>

              {contact.next_follow_up && (
                <div>
                  <Label>Próximo Follow-up</Label>
                  <p className="text-sm mt-1">
                    {format(new Date(contact.next_follow_up), "dd/MM/yyyy", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-3">
            {history && history.length > 0 ? (
              history.map((item: any) => (
                <Card key={item.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">
                        {getActionLabel(item.action_type)}
                      </p>
                      {item.old_value && item.new_value && (
                        <p className="text-xs text-muted-foreground">
                          De: {item.old_value} → Para: {item.new_value}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-sm text-muted-foreground">{item.notes}</p>
                      )}
                      {item.profiles && (
                        <p className="text-xs text-muted-foreground">
                          Por: {item.profiles.full_name}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </Card>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum histórico registrado
              </p>
            )}
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
            <Card className="p-4">
              <Label>Adicionar Nota</Label>
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Digite sua nota aqui..."
                className="mt-2"
              />
              <Button onClick={handleAddNote} className="mt-2" disabled={!newNote.trim()}>
                Adicionar Nota
              </Button>
            </Card>

            {contact.pipeline_notes && (
              <Card className="p-4">
                <Label>Notas do Pipeline</Label>
                <p className="text-sm text-muted-foreground mt-2">
                  {contact.pipeline_notes}
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

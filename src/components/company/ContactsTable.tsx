import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, History } from "lucide-react";
import { Contact, useDeleteContact } from "@/hooks/useContacts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatPhoneDisplay } from "@/lib/phone-utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ContactsTableProps {
  contacts: Contact[];
  onEdit: (contact: Contact) => void;
  onViewHistory: (contact: Contact) => void;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

export default function ContactsTable({
  contacts,
  onEdit,
  onViewHistory,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
}: ContactsTableProps) {
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null);
  const deleteContact = useDeleteContact();

  const handleDelete = () => {
    if (deleteContactId) {
      deleteContact.mutate(deleteContactId);
      setDeleteContactId(null);
    }
  };

  const isBirthMonth = (birthDate?: string) => {
    if (!birthDate) return false;
    const date = parseISO(birthDate);
    return date.getMonth() === new Date().getMonth();
  };

  const handleToggleSelect = (contactId: string) => {
    if (!onSelectionChange) return;
    
    if (selectedIds.includes(contactId)) {
      onSelectionChange(selectedIds.filter((id) => id !== contactId));
    } else {
      onSelectionChange([...selectedIds, contactId]);
    }
  };

  const handleToggleSelectAll = () => {
    if (!onSelectionChange) return;
    
    if (selectedIds.length === contacts.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(contacts.map((c) => c.id));
    }
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === contacts.length && contacts.length > 0}
                    onChange={handleToggleSelectAll}
                    className="cursor-pointer"
                  />
                </TableHead>
              )}
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Data de Nascimento</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={selectable ? 7 : 6} className="text-center text-muted-foreground">
                  Nenhum contato encontrado
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((contact) => (
                <TableRow key={contact.id}>
                  {selectable && (
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(contact.id)}
                        onChange={() => handleToggleSelect(contact.id)}
                        className="cursor-pointer"
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium">
                    {contact.name}
                    {isBirthMonth(contact.birth_date) && (
                      <Badge variant="secondary" className="ml-2">
                        🎂
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{formatPhoneDisplay(contact.phone)}</TableCell>
                  <TableCell>{contact.email || "-"}</TableCell>
                  <TableCell>
                    {contact.birth_date
                      ? format(parseISO(contact.birth_date), "dd/MM/yyyy", { locale: ptBR })
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {contact.tags && contact.tags.length > 0 ? (
                        contact.tags.map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewHistory(contact)}
                      >
                        <History className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(contact)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteContactId(contact.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteContactId} onOpenChange={() => setDeleteContactId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este contato? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

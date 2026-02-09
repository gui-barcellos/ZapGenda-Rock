import { useState, useMemo } from "react";
import CompanyLayout from "@/components/layout/CompanyLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Users, Calendar, Tag, ChevronLeft, ChevronRight, TagIcon, X } from "lucide-react";
import ContactsTable from "@/components/company/ContactsTable";
import ContactDialog from "@/components/company/ContactDialog";
import ContactHistoryDialog from "@/components/company/ContactHistoryDialog";
import { BulkTagDialog } from "@/components/company/tags/BulkTagDialog";
import { useContacts, useContactsCount, Contact } from "@/hooks/useContacts";
import { useTags } from "@/hooks/useTags";

export default function Patients() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [bulkTagDialogOpen, setBulkTagDialogOpen] = useState(false);
  const pageSize = 50;

  const { data: contactsData, isLoading } = useContacts(currentPage, pageSize);
  const { data: totalContactsCount } = useContactsCount();
  const { tags } = useTags();

  const handleEdit = (contact: Contact) => {
    setSelectedContact(contact);
    setContactDialogOpen(true);
  };

  const handleViewHistory = (contact: Contact) => {
    setSelectedContact(contact);
    setHistoryDialogOpen(true);
  };

  const handleNewContact = () => {
    setSelectedContact(null);
    setContactDialogOpen(true);
  };

  const contacts = contactsData?.contacts || [];
  const totalPages = contactsData?.totalPages || 1;

  const filteredContacts = useMemo(() => {
    if (!contacts) return [];

    return contacts.filter((contact) => {
      const matchesSearch =
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.phone.includes(searchQuery);

      const matchesTag =
        !selectedTag || contact.tags?.includes(selectedTag);

      return matchesSearch && matchesTag;
    });
  }, [contacts, searchQuery, selectedTag]);

  // Contatos criados este mês (usa contagem total, não filtrada)
  const newThisMonth = useMemo(() => {
    if (!contactsData?.contacts) return 0;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return contactsData.contacts.filter((contact) => {
      const createdDate = new Date(contact.created_at);
      return (
        createdDate.getMonth() === currentMonth &&
        createdDate.getFullYear() === currentYear
      );
    }).length;
  }, [contactsData]);

  // Aniversariantes do mês
  const birthdaysThisMonth = useMemo(() => {
    if (!contactsData?.contacts) return 0;
    const currentMonth = new Date().getMonth();

    return contactsData.contacts.filter((contact) => {
      if (!contact.birth_date) return false;
      const birthMonth = new Date(contact.birth_date).getMonth();
      return birthMonth === currentMonth;
    }).length;
  }, [contactsData]);

  return (
    <CompanyLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie os dados dos clientes da sua empresa
            </p>
          </div>
          <Button onClick={handleNewContact}>
            <UserPlus className="h-4 w-4 mr-2" />
            Novo Cliente
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="mt-3">
                <p className="text-sm font-medium text-muted-foreground">Total de Clientes</p>
                <div className="text-2xl font-bold">
                  {isLoading ? <Skeleton className="h-8 w-16" /> : totalContactsCount || 0}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <UserPlus className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="mt-3">
                <p className="text-sm font-medium text-muted-foreground">Novos Este Mês</p>
                <div className="text-2xl font-bold">
                  {isLoading ? <Skeleton className="h-8 w-16" /> : newThisMonth}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="mt-3">
                <p className="text-sm font-medium text-muted-foreground">Aniversariantes Este Mês</p>
                <div className="text-2xl font-bold">
                  {isLoading ? <Skeleton className="h-8 w-16" /> : birthdaysThisMonth}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <Tag className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="mt-3">
                <p className="text-sm font-medium text-muted-foreground">Tags Cadastradas</p>
                <div className="text-2xl font-bold">
                  {isLoading ? <Skeleton className="h-8 w-16" /> : tags?.length || 0}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <div className="flex gap-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="border rounded-md px-3 py-2 text-sm"
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
          >
            <option value="">Todas as tags</option>
            {tags.map((tag) => (
              <option key={tag.name} value={tag.name}>
                {tag.name} ({tag.count})
              </option>
            ))}
          </select>
        </div>

        {/* Bulk Actions Bar */}
        {selectedContactIds.length > 0 && (
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="text-lg">
                  {selectedContactIds.length} selecionado(s)
                </Badge>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setBulkTagDialogOpen(true)}
                >
                  <TagIcon className="mr-2 h-4 w-4" />
                  Gerenciar Tags
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedContactIds([])}
                className="text-primary-foreground hover:bg-primary-foreground/20"
              >
                <X className="mr-2 h-4 w-4" />
                Limpar Seleção
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Contacts Table */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <ContactsTable
            contacts={filteredContacts}
            onEdit={handleEdit}
            onViewHistory={handleViewHistory}
            selectable
            selectedIds={selectedContactIds}
            onSelectionChange={setSelectedContactIds}
          />
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <ContactDialog
        open={contactDialogOpen}
        onOpenChange={setContactDialogOpen}
        contact={selectedContact}
      />

      <ContactHistoryDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        contact={selectedContact}
      />

      <BulkTagDialog
        open={bulkTagDialogOpen}
        onOpenChange={setBulkTagDialogOpen}
        selectedContactIds={selectedContactIds}
        onSuccess={() => setSelectedContactIds([])}
      />
    </CompanyLayout>
  );
}

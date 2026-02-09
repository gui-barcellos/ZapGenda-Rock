import { useState } from "react";
import { Check, ChevronsUpDown, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useSearchContacts, useContact, type Contact } from "@/hooks/useContacts";
import ContactDialog from "./ContactDialog";

interface ContactSearchSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function ContactSearchSelect({
  value,
  onValueChange,
  placeholder = "Selecione um cliente...",
}: ContactSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showContactDialog, setShowContactDialog] = useState(false);
  
  const { data: contacts = [] } = useSearchContacts(searchTerm);
  const { data: initialContact } = useContact(value);
  
  const selectedContact = contacts.find((contact) => contact.id === value) || initialContact;

  const handleContactCreated = (newContact: Contact | undefined) => {
    if (newContact && newContact.id) {
      onValueChange(newContact.id);
      setOpen(false);
    }
    setShowContactDialog(false);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedContact ? (
              <span className="truncate">
                {selectedContact.name} - {selectedContact.phone}
              </span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Buscar por nome, telefone ou CPF..."
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandList>
              <CommandEmpty>
                <div className="py-6 text-center space-y-2">
                  <Search className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum cliente encontrado
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowContactDialog(true);
                      setOpen(false);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Cadastrar novo cliente
                  </Button>
                </div>
              </CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="new"
                  onSelect={() => {
                    setShowContactDialog(true);
                    setOpen(false);
                  }}
                  className="border-b"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <span className="font-medium">Cadastrar novo cliente</span>
                </CommandItem>
                {contacts.map((contact) => (
                  <CommandItem
                    key={contact.id}
                    value={contact.id}
                    onSelect={(currentValue) => {
                      onValueChange(currentValue === value ? "" : currentValue);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === contact.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{contact.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {contact.phone}
                        {contact.email && ` • ${contact.email}`}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <ContactDialog
        open={showContactDialog}
        onOpenChange={setShowContactDialog}
        onSuccess={handleContactCreated}
      />
    </>
  );
}

import { CRMContact } from "@/hooks/useCRM";
import { Card } from "@/components/ui/card";
import { Phone, Mail, DollarSign, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { CRMContactDetailsDialog } from "./CRMContactDetailsDialog";

interface CRMContactCardProps {
  contact: CRMContact;
  onDragStart: (contactId: string) => void;
}

export const CRMContactCard = ({ contact, onDragStart }: CRMContactCardProps) => {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <>
      <Card
        className="p-3 cursor-move hover:shadow-md transition-shadow bg-card"
        draggable
        onDragStart={() => onDragStart(contact.id)}
        onClick={() => setDetailsOpen(true)}
      >
        <div className="space-y-2">
          <h4 className="font-semibold text-sm truncate">{contact.name}</h4>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Phone className="h-3 w-3" />
            <span className="truncate">{contact.phone}</span>
          </div>

          {contact.email && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Mail className="h-3 w-3" />
              <span className="truncate">{contact.email}</span>
            </div>
          )}

          {contact.estimated_value && (
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
              <DollarSign className="h-3 w-3" />
              <span>R$ {contact.estimated_value.toFixed(2)}</span>
            </div>
          )}

          {contact.next_follow_up && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>
                {format(new Date(contact.next_follow_up), "dd/MM/yyyy", {
                  locale: ptBR,
                })}
              </span>
            </div>
          )}

          {contact.tags && contact.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {contact.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded"
                >
                  {tag}
                </span>
              ))}
              {contact.tags.length > 2 && (
                <span className="text-xs text-muted-foreground">
                  +{contact.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </Card>

      <CRMContactDetailsDialog
        contact={contact}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </>
  );
};

import { CRMContact } from "@/hooks/useCRM";
import { CRMStage } from "@/hooks/useCRMStages";
import { CRMContactCard } from "./CRMContactCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useMoveContact } from "@/hooks/useCRM";
import { useState } from "react";

interface CRMKanbanProps {
  contacts: CRMContact[] | undefined;
  stages: CRMStage[] | undefined;
  isLoading: boolean;
}

export const CRMKanban = ({ contacts, stages, isLoading }: CRMKanbanProps) => {
  const moveContact = useMoveContact();
  const [draggedContactId, setDraggedContactId] = useState<string | null>(null);

  const getContactsByStage = (stageId: string) => {
    return contacts?.filter((c) => c.funnel_stage === stageId) || [];
  };

  const handleDragStart = (contactId: string) => {
    setDraggedContactId(contactId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (stageId: string) => {
    if (draggedContactId) {
      moveContact.mutate({
        contactId: draggedContactId,
        newStage: stageId,
      });
      setDraggedContactId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 overflow-x-auto">
      {stages?.map((stage) => (
        <div
          key={stage.id}
          className="flex flex-col min-w-[280px]"
          onDragOver={handleDragOver}
          onDrop={() => handleDrop(stage.id)}
        >
          <div
            className="p-4 rounded-t-lg font-semibold text-white"
            style={{ backgroundColor: stage.color }}
          >
            <div className="flex items-center justify-between">
              <span>{stage.name}</span>
              <span className="bg-white/20 px-2 py-1 rounded text-sm">
                {getContactsByStage(stage.id).length}
              </span>
            </div>
          </div>
          <div className="bg-muted/50 rounded-b-lg p-2 space-y-2 min-h-[300px] flex-1">
            {getContactsByStage(stage.id).map((contact) => (
              <CRMContactCard
                key={contact.id}
                contact={contact}
                onDragStart={handleDragStart}
              />
            ))}
            {getContactsByStage(stage.id).length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8">
                Nenhum contato neste estágio
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

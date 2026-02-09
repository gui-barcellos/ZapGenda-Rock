import { useState } from "react";
import CompanyLayout from "@/components/layout/CompanyLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Trash2, HelpCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyFaqs } from "@/hooks/useCompanyFaqs";
import { FAQDialog } from "@/components/company/FAQDialog";
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

const FAQ = () => {
  const { companyId } = useAuth();
  const { faqs, isLoading, createFaq, updateFaq, deleteFaq } = useCompanyFaqs(companyId || null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [faqToDelete, setFaqToDelete] = useState<string | null>(null);

  const handleSave = (data: { question: string; answer: string }) => {
    if (editingFaq) {
      updateFaq.mutate(
        { id: editingFaq.id, ...data },
        {
          onSuccess: () => {
            setDialogOpen(false);
            setEditingFaq(null);
          },
        }
      );
    } else {
      createFaq.mutate(data, {
        onSuccess: () => {
          setDialogOpen(false);
        },
      });
    }
  };

  const handleEdit = (faq: any) => {
    setEditingFaq(faq);
    setDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setFaqToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (faqToDelete) {
      deleteFaq.mutate(faqToDelete, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setFaqToDelete(null);
        },
      });
    }
  };

  const handleAddNew = () => {
    setEditingFaq(null);
    setDialogOpen(true);
  };

  return (
    <CompanyLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Perguntas Frequentes</h1>
            <p className="text-muted-foreground mt-2">
              Cadastre perguntas e respostas para a IA responder automaticamente
            </p>
          </div>
          <Button onClick={handleAddNew}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Pergunta
          </Button>
        </div>

        {!isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <HelpCircle className="h-4 w-4" />
            <span>{faqs.length} perguntas cadastradas</span>
          </div>
        )}

        {isLoading ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Carregando perguntas...
            </CardContent>
          </Card>
        ) : faqs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Nenhuma pergunta cadastrada ainda
              </p>
              <Button onClick={handleAddNew} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Primeira Pergunta
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {faqs.map((faq) => (
              <Card key={faq.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-semibold">
                      {faq.question}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(faq)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(faq.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {faq.answer}
                  </p>
                  {faq.summary && (
                    <p className="text-xs text-muted-foreground/60 mt-2 italic">
                      Palavras-chave: {faq.summary}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <FAQDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
        editingFaq={editingFaq}
        isPending={createFaq.isPending || updateFaq.isPending}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Pergunta</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta pergunta? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CompanyLayout>
  );
};

export default FAQ;

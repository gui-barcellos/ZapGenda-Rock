import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
interface FAQ {
  id: string;
  question: string;
  answer: string;
}
interface FAQDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    question: string;
    answer: string;
  }) => void;
  editingFaq: FAQ | null;
  isPending: boolean;
}
export const FAQDialog = ({
  open,
  onOpenChange,
  onSave,
  editingFaq,
  isPending
}: FAQDialogProps) => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  useEffect(() => {
    if (editingFaq) {
      setQuestion(editingFaq.question);
      setAnswer(editingFaq.answer);
    } else {
      setQuestion("");
      setAnswer("");
    }
  }, [editingFaq, open]);
  const handleSave = () => {
    if (!question.trim() || !answer.trim()) return;
    onSave({
      question: question.trim(),
      answer: answer.trim()
    });
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {editingFaq ? "Editar Pergunta" : "Adicionar Pergunta"}
          </DialogTitle>
          <DialogDescription>
            {editingFaq ? "Atualize a pergunta e resposta abaixo." : "Adicione uma nova pergunta frequente e sua resposta."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="question">Pergunta</Label>
            <Input id="question" value={question} onChange={e => setQuestion(e.target.value)} placeholder="Ex: O que preciso levar no dia do agendamento?" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="answer">Resposta</Label>
            <Textarea id="answer" value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Responda de forma clara e objetiva..." className="min-h-[150px]" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!question.trim() || !answer.trim() || isPending}>
            {isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>;
};
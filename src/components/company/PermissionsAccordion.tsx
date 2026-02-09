import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Star, User } from "lucide-react";

export function PermissionsAccordion() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Entenda as Permissões</CardTitle>
        <CardDescription>
          Diferenças entre os níveis de acesso
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="owner">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-yellow-500" />
                <span>Administrador Proprietário</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Acesso total ao sistema</li>
                <li>Único que pode gerenciar usuários (convidar, promover, excluir)</li>
                <li>Não pode ser excluído</li>
                <li>Identificado pelo email do proprietário da empresa</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="admin">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-blue-500" />
                <span>Administrador Extra</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Acessa todas as telas (mesma interface do Proprietário)</li>
                <li><strong>NÃO pode gerenciar usuários</strong></li>
                <li>Pode ser excluído pelo Administrador Proprietário</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="attendant">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <span>Atendente</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Acesso limitado: Agenda, Chat ao Vivo, Contatos/Clientes, Relatórios</li>
                <li>Não acessa Configurações</li>
                <li>Vê apenas relatórios operacionais (própria performance)</li>
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

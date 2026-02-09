import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCompanies } from "@/hooks/useCompanies";
import { useAIPromptLogs } from "@/hooks/useAIPromptLogs";
import { useState } from "react";
import { Loader2, FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AILogList } from "./AILogList";
import { useQueryClient } from "@tanstack/react-query";

export const AIPromptLogViewer = () => {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const { data: companies, isLoading: loadingCompanies } = useCompanies();
  const { data: logs, isLoading: loadingLogs, refetch } = useAIPromptLogs(selectedCompanyId, 20);
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ["ai-prompt-logs", selectedCompanyId] });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Log de Interações com IA
              </CardTitle>
              <CardDescription>
                Visualize as últimas 20 interações da IA com entrada (prompt), saída (resposta) e métricas de tokens.
              </CardDescription>
            </div>
            {selectedCompanyId && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loadingLogs}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loadingLogs ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Selecionar Workspace
            </label>
            <Select
              value={selectedCompanyId}
              onValueChange={setSelectedCompanyId}
              disabled={loadingCompanies}
            >
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Escolha uma empresa..." />
              </SelectTrigger>
              <SelectContent>
                {companies?.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name} ({company.workspace_id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loadingLogs && selectedCompanyId && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {!loadingLogs && selectedCompanyId && (
            <AILogList logs={logs} isLoading={loadingLogs} />
          )}

          {!selectedCompanyId && (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Selecione um workspace para ver os logs de interação com a IA.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

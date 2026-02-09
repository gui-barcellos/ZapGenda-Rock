import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AIPromptLog, FunctionCallLog } from "@/hooks/useAIPromptLogs";
import { ChevronDown, ChevronUp, Clock, Cpu, MessageSquare, Zap, Link2, Unlink, GitBranch, Settings2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface AILogListProps {
  logs: AIPromptLog[] | undefined;
  isLoading: boolean;
}

export const AILogList = ({ logs, isLoading }: AILogListProps) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    const newSet = new Set(expandedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedIds(newSet);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatResponseTime = (ms: number | null) => {
    if (!ms) return "N/A";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getStageColor = (stage: string | null) => {
    switch (stage) {
      case 'idle': return 'bg-muted text-muted-foreground';
      case 'scheduling': return 'bg-blue-500/20 text-blue-600';
      case 'canceling': return 'bg-red-500/20 text-red-600';
      case 'rescheduling': return 'bg-amber-500/20 text-amber-600';
      case 'consulting': return 'bg-purple-500/20 text-purple-600';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>Nenhum log encontrado para este workspace.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[600px]">
      <div className="space-y-3 pr-4">
        {logs.map((log) => {
          const isExpanded = expandedIds.has(log.id);
          const functionCalls = log.function_calls || [];
          
          return (
            <Collapsible
              key={log.id}
              open={isExpanded}
              onOpenChange={() => toggleExpanded(log.id)}
            >
              <Card className="border border-border/50 hover:border-border transition-colors">
                <CollapsibleTrigger asChild>
                  <CardContent className="p-4 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Indicador de encadeamento */}
                        {log.is_first_message ? (
                          <Badge variant="outline" className="gap-1 bg-green-500/10 text-green-600 border-green-500/30">
                            <Unlink className="h-3 w-3" />
                            Nova
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 bg-blue-500/10 text-blue-600 border-blue-500/30">
                            <Link2 className="h-3 w-3" />
                            Encadeada
                          </Badge>
                        )}
                        <div className="text-sm">
                          <span className="font-medium">
                            {formatDate(log.created_at)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Stage Badge */}
                        {log.conversation_stage && (
                          <Badge className={`gap-1 ${getStageColor(log.conversation_stage)}`}>
                            <GitBranch className="h-3 w-3" />
                            {log.conversation_stage}
                          </Badge>
                        )}
                        
                        {/* Function Calls Count */}
                        {functionCalls.length > 0 && (
                          <Badge variant="secondary" className="gap-1 bg-purple-500/10 text-purple-600">
                            <Settings2 className="h-3 w-3" />
                            {functionCalls.length} tool{functionCalls.length > 1 ? 's' : ''}
                          </Badge>
                        )}
                        
                        <Badge variant="outline" className="gap-1">
                          <Cpu className="h-3 w-3" />
                          {log.model_used || "N/A"}
                        </Badge>
                        <Badge variant="secondary" className="gap-1">
                          <Clock className="h-3 w-3" />
                          {formatResponseTime(log.response_time_ms)}
                        </Badge>
                        <Badge className="gap-1">
                          <Zap className="h-3 w-3" />
                          {log.tokens_total || 0} tokens
                        </Badge>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    
                    {/* Preview da mensagem do usuário e resposta */}
                    {!isExpanded && (
                      <div className="mt-2 space-y-1">
                        {log.user_message && (
                          <p className="text-sm text-muted-foreground truncate">
                            👤 {log.user_message.substring(0, 80)}{log.user_message.length > 80 ? '...' : ''}
                          </p>
                        )}
                        {log.ai_response && (
                          <p className="text-sm text-muted-foreground truncate">
                            🤖 {log.ai_response.substring(0, 80)}{log.ai_response.length > 80 ? '...' : ''}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0 pb-4 px-4 space-y-4">
                    {/* Encadeamento Info */}
                    <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg text-sm">
                      <div className="flex-1">
                        <span className="text-muted-foreground">🔗 Response ID:</span>{" "}
                        <code className="font-mono text-xs bg-background px-1 py-0.5 rounded">
                          {log.response_id_generated?.substring(0, 30) || "N/A"}...
                        </code>
                      </div>
                      {log.previous_response_id && (
                        <div className="flex-1">
                          <span className="text-muted-foreground">⬅️ Previous:</span>{" "}
                          <code className="font-mono text-xs bg-background px-1 py-0.5 rounded">
                            {log.previous_response_id.substring(0, 30)}...
                          </code>
                        </div>
                      )}
                    </div>

                    {/* Tokens Breakdown */}
                    <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg text-sm">
                      <div>
                        <span className="text-muted-foreground">📤 Input:</span>{" "}
                        <span className="font-medium">{log.tokens_input}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">📥 Output:</span>{" "}
                        <span className="font-medium">{log.tokens_output}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">📊 Total:</span>{" "}
                        <span className="font-medium">{log.tokens_total}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">🔄 Loops:</span>{" "}
                        <span className="font-medium">{log.loop_iterations || 1}</span>
                      </div>
                    </div>

                    {/* Mensagem do Usuário */}
                    {log.user_message && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          👤 Mensagem do Usuário
                        </h4>
                        <div className="p-3 rounded-md border bg-muted/30 text-sm">
                          {log.user_message}
                        </div>
                      </div>
                    )}

                    {/* Function Calls */}
                    {functionCalls.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          🛠️ Function Calls ({functionCalls.length})
                        </h4>
                        <div className="space-y-2">
                          {functionCalls.map((fc: FunctionCallLog, idx: number) => (
                            <div key={idx} className="p-3 rounded-md border bg-purple-500/5 border-purple-500/20">
                              <div className="flex items-center justify-between mb-2">
                                <Badge variant="outline" className="font-mono text-xs">
                                  {fc.name}
                                </Badge>
                                {fc.timestamp && (
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(fc.timestamp).toLocaleTimeString('pt-BR')}
                                  </span>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-muted-foreground block mb-1">Args:</span>
                                  <pre className="font-mono bg-background p-2 rounded overflow-x-auto max-h-24">
                                    {JSON.stringify(fc.args, null, 2)}
                                  </pre>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block mb-1">Result:</span>
                                  <pre className="font-mono bg-background p-2 rounded overflow-x-auto max-h-24">
                                    {typeof fc.result === 'string' 
                                      ? fc.result.substring(0, 200) 
                                      : JSON.stringify(fc.result, null, 2).substring(0, 200)}
                                    {(typeof fc.result === 'string' ? fc.result.length : JSON.stringify(fc.result).length) > 200 ? '...' : ''}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Resposta da IA */}
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        🤖 Resposta da IA
                      </h4>
                      <ScrollArea className="h-[150px] rounded-md border bg-primary/5">
                        <pre className="p-4 text-xs whitespace-pre-wrap font-mono">
                          {log.ai_response || "(vazio)"}
                        </pre>
                      </ScrollArea>
                    </div>

                    {/* Prompt Enviado (apenas se primeira mensagem) */}
                    {log.is_first_message && log.full_prompt && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          📤 System Prompt (primeira mensagem)
                        </h4>
                        <ScrollArea className="h-[200px] rounded-md border bg-muted/30">
                          <pre className="p-4 text-xs whitespace-pre-wrap font-mono">
                            {log.full_prompt}
                          </pre>
                        </ScrollArea>
                      </div>
                    )}

                    {/* Config Snapshot */}
                    {log.ai_config_snapshot && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          ⚙️ Configuração Usada
                        </h4>
                        <ScrollArea className="h-[100px] rounded-md border bg-muted/30">
                          <pre className="p-4 text-xs font-mono">
                            {JSON.stringify(log.ai_config_snapshot, null, 2)}
                          </pre>
                        </ScrollArea>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>
    </ScrollArea>
  );
};
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Pencil, X, Cpu, Settings2 } from "lucide-react";
import { useMasterPrompt, useUpdateMasterPrompt } from "@/hooks/useMasterPrompt";
import { VariableEditor } from "@/components/company/VariableEditor";
import { Badge } from "@/components/ui/badge";

export function MasterPromptTab() {
  const { data: masterPrompt, isLoading } = useMasterPrompt();
  const updatePrompt = useUpdateMasterPrompt();
  
  // Separate edit modes for prompt and config
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  
  // Form state
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("gpt-5");
  const [temperature, setTemperature] = useState(0.7);
  const [topP, setTopP] = useState(1.0);
  const [maxTokens, setMaxTokens] = useState(4000);
  
  const [stateExpirationMinutes, setStateExpirationMinutes] = useState(30);
  const [paragraphDelaySeconds, setParagraphDelaySeconds] = useState(2);

  // Load data from masterPrompt
  useEffect(() => {
    if (masterPrompt) {
      setPrompt(masterPrompt.prompt || "");
      setModel(masterPrompt.model || "gpt-5");
      setTemperature(masterPrompt.temperature || 0.7);
      setTopP(masterPrompt.top_p || 1.0);
      setMaxTokens(masterPrompt.max_tokens || 4000);
      setStateExpirationMinutes(masterPrompt.state_expiration_minutes || 30);
      setParagraphDelaySeconds(masterPrompt.paragraph_delay_seconds || 2);
    }
  }, [masterPrompt]);

  // Helper to get model info
  const getModelInfo = () => {
    if (model.includes('gpt-5-nano')) return { label: 'GPT-5 Nano', hint: 'Mais rápido e econômico. Tokens: 4000+', supportsTemp: false };
    if (model.includes('gpt-5-mini')) return { label: 'GPT-5 Mini', hint: 'Equilíbrio entre custo e qualidade. Tokens: 6000+', supportsTemp: false };
    if (model.includes('gpt-5') && !model.includes('mini') && !model.includes('nano')) return { label: 'GPT-5', hint: 'Mais poderoso. Tokens: 8000+', supportsTemp: false };
    if (model.includes('gpt-4o-mini')) return { label: 'GPT-4o Mini', hint: 'Modelo legado. Tokens: 1000+', supportsTemp: true };
    if (model.includes('gpt-4o')) return { label: 'GPT-4o', hint: 'Modelo legado avançado. Tokens: 1000+', supportsTemp: true };
    return { label: model, hint: '', supportsTemp: true };
  };

  const modelInfo = getModelInfo();

  // Handle Cancel Prompt - reset to saved values
  const handleCancelPrompt = () => {
    if (masterPrompt) {
      setPrompt(masterPrompt.prompt || "");
    }
    setIsEditingPrompt(false);
  };

  // Handle Cancel Config - reset to saved values
  const handleCancelConfig = () => {
    if (masterPrompt) {
      setModel(masterPrompt.model || "gpt-5");
      setTemperature(masterPrompt.temperature || 0.7);
      setTopP(masterPrompt.top_p || 1.0);
      setMaxTokens(masterPrompt.max_tokens || 4000);
      
      setStateExpirationMinutes(masterPrompt.state_expiration_minutes || 30);
      setParagraphDelaySeconds(masterPrompt.paragraph_delay_seconds || 2);
    }
    setIsEditingConfig(false);
  };

  // Handle Save Prompt
  const handleSavePrompt = async () => {
    await updatePrompt.mutateAsync({ prompt });
    setIsEditingPrompt(false);
  };

  // Handle Save Config
  const handleSaveConfig = async () => {
    await updatePrompt.mutateAsync({ 
      model, 
      temperature: modelInfo.supportsTemp ? temperature : null, 
      top_p: modelInfo.supportsTemp ? topP : null, 
      max_tokens: maxTokens,
      state_expiration_minutes: stateExpirationMinutes,
      paragraph_delay_seconds: paragraphDelaySeconds
    });
    setIsEditingConfig(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status da API */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Cpu className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">OpenAI Responses API</p>
                <p className="text-sm text-muted-foreground">
                  GPT-5 com histórico via whatsapp_messages
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-green-600 border-green-300">
              Ativo
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Card 1: Prompt Master Global */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Prompt Master Global</CardTitle>
              <CardDescription>
                Define as instruções do sistema. Contexto de empresa, cliente e estado é injetado automaticamente.
              </CardDescription>
            </div>
            {!isEditingPrompt && (
              <Button onClick={() => setIsEditingPrompt(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditingPrompt ? (
            // EDIT MODE - Prompt
            <>
              <div className="space-y-2">
                <Label>Instruções do Sistema</Label>
                <VariableEditor
                  value={prompt}
                  onChange={setPrompt}
                  placeholder="Digite as regras gerais para a IA..."
                  rows={16}
                  showPreview={false}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleCancelPrompt}
                  disabled={updatePrompt.isPending}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  onClick={handleSavePrompt}
                  disabled={updatePrompt.isPending}
                >
                  {updatePrompt.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar
                </Button>
              </div>
            </>
          ) : (
            // VIEW MODE - Prompt
            <>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Instruções do Sistema</Label>
                <div className="bg-muted/30 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <div className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
                    {masterPrompt?.prompt ? (
                      masterPrompt.prompt.split('\n').map((line, lineIndex) => {
                        const regex = /(\{[^}]+\})/g;
                        const parts = line.split(regex);
                        
                        return (
                          <div key={lineIndex} className="min-h-[1.25em]">
                            {parts.map((part, partIndex) => {
                              if (part.match(/\{[^}]+\}/)) {
                                return (
                                  <span
                                    key={partIndex}
                                    className="inline-block px-1.5 py-0.5 mx-0.5 bg-primary/20 text-primary rounded text-xs font-mono"
                                  >
                                    {part.replace(/[{}]/g, '')}
                                  </span>
                                );
                              }
                              return <span key={partIndex}>{part}</span>;
                            })}
                          </div>
                        );
                      })
                    ) : (
                      "Nenhuma instrução configurada."
                    )}
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div className="text-sm text-muted-foreground pt-2 border-t">
                {masterPrompt?.updated_at && (
                  <p>Última atualização: {new Date(masterPrompt.updated_at).toLocaleString("pt-BR")}</p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Card 2: Configurações do Modelo */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Configurações do Modelo
              </CardTitle>
              <CardDescription>
                Parâmetros técnicos do modelo de IA e comportamento das respostas.
              </CardDescription>
            </div>
            {!isEditingConfig && (
              <Button onClick={() => setIsEditingConfig(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditingConfig ? (
            // EDIT MODE - Config
            <>
              <div className="grid grid-cols-2 gap-6">
                {/* Modelo */}
                <div className="space-y-2">
                  <Label>Modelo</Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-5">GPT-5 (Recomendado)</SelectItem>
                      <SelectItem value="gpt-5-mini">GPT-5 Mini</SelectItem>
                      <SelectItem value="gpt-5-nano">GPT-5 Nano (Econômico)</SelectItem>
                      <SelectItem value="gpt-4o">GPT-4o (Legado)</SelectItem>
                      <SelectItem value="gpt-4o-mini">GPT-4o Mini (Legado)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    💡 {modelInfo.hint}
                  </p>
                </div>

                {/* Max Tokens */}
                <div className="space-y-2">
                  <Label>Max Tokens de Saída</Label>
                  <Input
                    type="number"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(Number(e.target.value))}
                    min={100}
                  />
                  <p className="text-xs text-muted-foreground">
                    Limite de tokens por resposta
                  </p>
                </div>


                {/* Expiração da Conversa */}
                <div className="space-y-2">
                  <Label>Expiração da Conversa (min)</Label>
                  <Input
                    type="number"
                    value={stateExpirationMinutes}
                    onChange={(e) => setStateExpirationMinutes(Number(e.target.value))}
                    min={1}
                    placeholder="Minutos de inatividade"
                  />
                  <p className="text-xs text-muted-foreground">
                    Tempo até resetar estado da conversa
                  </p>
                </div>

                {/* Delay entre Parágrafos */}
                <div className="space-y-2">
                  <Label>Delay entre Parágrafos (s)</Label>
                  <Input
                    type="number"
                    value={paragraphDelaySeconds}
                    onChange={(e) => setParagraphDelaySeconds(Number(e.target.value))}
                    min={1}
                    max={10}
                    placeholder="Segundos"
                  />
                  <p className="text-xs text-muted-foreground">
                    Sistema aplica ±1s de variação para parecer natural
                  </p>
                </div>

                {/* Placeholder for alignment */}
                <div />

                {/* Temperature - only for legacy models */}
                {modelInfo.supportsTemp && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Temperature</Label>
                      <span className="text-sm text-muted-foreground">{temperature.toFixed(2)}</span>
                    </div>
                    <Slider
                      value={[temperature]}
                      onValueChange={([v]) => setTemperature(v)}
                      min={0}
                      max={2}
                      step={0.1}
                    />
                    <p className="text-xs text-muted-foreground">
                      Criatividade (0 = determinístico)
                    </p>
                  </div>
                )}

                {/* Top P - only for legacy models */}
                {modelInfo.supportsTemp && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Top P</Label>
                      <span className="text-sm text-muted-foreground">{topP.toFixed(2)}</span>
                    </div>
                    <Slider
                      value={[topP]}
                      onValueChange={([v]) => setTopP(v)}
                      min={0}
                      max={1}
                      step={0.05}
                    />
                    <p className="text-xs text-muted-foreground">
                      Nucleus sampling
                    </p>
                  </div>
                )}

                {/* Info for GPT-5 models */}
                {!modelInfo.supportsTemp && (
                  <div className="col-span-2 p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      ℹ️ GPT-5 não suporta ajuste de temperature/top_p - usa valores otimizados internamente.
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleCancelConfig}
                  disabled={updatePrompt.isPending}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveConfig}
                  disabled={updatePrompt.isPending}
                >
                  {updatePrompt.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar
                </Button>
              </div>
            </>
          ) : (
            // VIEW MODE - Config
            <div className="grid grid-cols-4 gap-4 py-3 px-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground">Modelo</p>
                <p className="font-medium text-sm">{masterPrompt?.model || "gpt-5"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Max Tokens</p>
                <p className="font-medium text-sm">{masterPrompt?.max_tokens || 4000}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Expiração</p>
                <p className="font-medium text-sm">{masterPrompt?.state_expiration_minutes || 30} min</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Delay Parágrafos</p>
                <p className="font-medium text-sm">{masterPrompt?.paragraph_delay_seconds || 2}s (±1s)</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

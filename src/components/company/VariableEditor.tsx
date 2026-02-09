import { useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Variable, Building2, User, Clock, List } from "lucide-react";

interface VariableEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  companyName?: string;
  aiName?: string;
  showConditionalsButton?: boolean;
  /** 
   * Modo legado: lista simples de variÃ¡veis para exibir como botÃµes 
   * Se fornecido, usa o layout antigo (botÃµes inline) ao invÃ©s do dropdown
   */
  variables?: string[];
  /** Labels localizados por token */
  variableLabels?: Record<string, string>;
  /** Esconder preview abaixo do textarea (default: true) */
  showPreview?: boolean;
}

// VariÃ¡veis disponÃ­veis organizadas por categoria
const VARIABLE_CATEGORIES = [
  {
    name: "IA & Empresa",
    icon: Building2,
    variables: [
      { name: "{ai_name}", description: "Nome da IA" },
      { name: "{empresa_nome}", description: "Nome da empresa" },
      { name: "{empresa_endereco}", description: "EndereÃ§o" },
      { name: "{empresa_horarios}", description: "HorÃ¡rios de funcionamento" },
    ]
  },
  {
    name: "Contato Atual",
    icon: User,
    variables: [
      { name: "{contact_name}", description: "Nome do cliente" },
      { name: "{contact_phone}", description: "Telefone" },
      { name: "{contact_tags}", description: "Tags do contato" },
    ]
  },
  {
    name: "Data & Hora",
    icon: Clock,
    variables: [
      { name: "{data_atual}", description: "Data atual" },
      { name: "{hora_atual}", description: "Hora atual" },
      { name: "{dia_semana}", description: "Dia da semana" },
    ]
  },
  {
    name: "Listas",
    icon: List,
    variables: [
      { name: "{profissionais}", description: "Lista de profissionais" },
      { name: "{servicos}", description: "Lista de serviÃ§os" },
    ]
  }
];

export function VariableEditor({ 
  value, 
  onChange, 
  placeholder = "Digite sua mensagem...",
  rows = 6,
  companyName,
  aiName,
  showConditionalsButton = false, // Legado - nÃ£o mais usado
  variables,
  variableLabels,
  showPreview = true
}: VariableEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [variablesOpen, setVariablesOpen] = useState(false);
  
  // Retorna cumprimento baseado na hora atual
  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };
  
  // Modo legado: se 'variables' foi passado, usar layout antigo
  const isLegacyMode = !!variables;
  
  // Remove TODOS os caracteres BiDi invisÃ­veis
  const sanitize = (text: string): string => {
    return text.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069\u061C\u200C\u200D]/g, '');
  };

  const normalizeTokens = (text: string): string => {
    if (!variables || variables.length === 0) return text;
    return text.replace(/\{\{[^}]+\}\}/g, (match) => {
      return variables.includes(match) ? match : match.replace(/[{}]/g, '');
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const sanitized = sanitize(e.target.value);
    onChange(normalizeTokens(sanitized));
  };

  // Paste customizado - sanitizar e inserir na posiÃ§Ã£o do cursor
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    
    const textarea = textareaRef.current;
    if (!textarea) return;

    const pastedText = e.clipboardData.getData('text/plain');
    const sanitizedText = sanitize(pastedText).replace(/[{}]/g, '');
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = value.substring(0, start);
    const after = value.substring(end);
    
    const newValue = before + sanitizedText + after;
    onChange(normalizeTokens(newValue));
    
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + sanitizedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Inserir texto na posiÃ§Ã£o do cursor
  const insertAtCursor = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = value.substring(0, start);
    const after = value.substring(end);
    
    const newValue = before + text + after;
    onChange(normalizeTokens(sanitize(newValue)));
    
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + text.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Inserir variÃ¡vel
  const handleInsertVariable = (variable: string) => {
    insertAtCursor(variable);
    setVariablesOpen(false);
  };

  // Renderizar preview com badges (preservando quebras de linha)
  const renderPreview = (text: string) => {
    const lines = text.split('\n');
    
    return lines.map((line, lineIndex) => {
      // Substituir {{company_name}} pelo nome real (se disponÃ­vel)
      let processedLine = line;
      if (companyName && processedLine.includes('{{company_name}}')) {
        processedLine = processedLine.replace(/\{\{company_name\}\}/g, '___EMPRESA___');
      }
      // Substituir {nome_assistente} pelo nome real (se disponÃ­vel)
      if (aiName && processedLine.includes('{nome_assistente}')) {
        processedLine = processedLine.replace(/\{nome_assistente\}/g, '___AI_NAME___');
      }
      
      // Processar variÃ¡veis e marcadores especiais
      const regex = /(\{\{[^}]+\}\}|___EMPRESA___|___AI_NAME___)/g;
      const parts = processedLine.split(regex);
      
      const lineContent = parts.map((part, partIndex) => {
        // Marcador especial da empresa
        if (part === '___EMPRESA___') {
          return (
            <span
              key={partIndex}
              className="inline-block px-2 py-0.5 mx-0.5 bg-primary text-primary-foreground rounded text-xs font-mono"
            >
              {companyName}
            </span>
          );
        }
        
        // Marcador especial do nome da assistente
        if (part === '___AI_NAME___') {
          return (
            <span
              key={partIndex}
              className="inline-block px-2 py-0.5 mx-0.5 bg-primary text-primary-foreground rounded text-xs font-mono"
            >
              {aiName}
            </span>
          );
        }
        
        // VariÃ¡vel normal (com chaves)
        if (part.match(/\{\{[^}]+\}\}/)) {
          return (
            <span
              key={partIndex}
              className="inline-block px-2 py-0.5 mx-0.5 bg-primary text-primary-foreground rounded text-xs font-mono"
            >
              {part.replace(/[{}]/g, '')}
            </span>
          );
        }
        
        // Texto normal
        return <span key={partIndex}>{part}</span>;
      });
      
      return (
        <div key={lineIndex}>
          {lineContent}
        </div>
      );
    });
  };

  // Modo legado: renderizar barra de botÃµes simples
  if (isLegacyMode) {
    return (
      <div className="space-y-2">
        {/* Barra de botÃµes de variÃ¡veis (modo legado) */}
        <div className="flex flex-wrap gap-2 p-2 bg-muted/30 rounded-md border">
          {variables.map(variable => (
            <Button
              key={variable}
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => insertAtCursor(variable)}
              className="h-7 text-xs font-mono"
            >
              {variableLabels?.[variable] || variable.replace(/[{}]/g, '')}
            </Button>
          ))}
        </div>
        
        {/* Textarea de ediÃ§Ã£o */}
        <Textarea
          ref={textareaRef}
          dir="ltr"
          value={value}
          onChange={handleChange}
          onPaste={handlePaste}
          onKeyDown={(e) => {
            if (e.key === "{" || e.key === "}") {
              e.preventDefault();
            }
          }}
          placeholder={placeholder}
          rows={rows}
          className="resize-none font-mono text-sm"
        />
        
        {/* Preview com badges */}
        {value && (
          <div className="p-3 bg-muted/20 rounded-md border border-dashed min-h-[60px]">
            <div className="text-sm text-muted-foreground mb-1 font-medium">
              VisualizaÃ§Ã£o:
            </div>
            <div className="text-sm leading-relaxed">
              {renderPreview(value.replace(/{cumprimento}/g, getTimeBasedGreeting()))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Modo avanÃ§ado: dropdown com categorias de variÃ¡veis
  return (
    <div className="space-y-2">
      {/* Barra de ferramentas */}
      <div className="flex gap-2">
        {/* BotÃ£o de VariÃ¡veis */}
        <Popover open={variablesOpen} onOpenChange={setVariablesOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="gap-2">
              <Variable className="h-4 w-4" />
              Inserir VariÃ¡vel
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 p-0">
            <ScrollArea className="h-[300px]">
              <div className="p-3 space-y-4">
                {VARIABLE_CATEGORIES.map((category) => (
                  <div key={category.name} className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <category.icon className="h-4 w-4" />
                      {category.name}
                    </div>
                    <div className="space-y-1">
                      {category.variables.map((variable) => (
                        <button
                          key={variable.name}
                          type="button"
                          onClick={() => handleInsertVariable(variable.name)}
                          className="w-full text-left px-2 py-1.5 rounded-md hover:bg-muted transition-colors"
                        >
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                            {variable.name}
                          </code>
                          <span className="text-xs text-muted-foreground ml-2">
                            {variable.description}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>
      
      {/* Textarea de ediÃ§Ã£o */}
      <Textarea
        ref={textareaRef}
        dir="ltr"
        value={value}
        onChange={handleChange}
        onPaste={handlePaste}
        onKeyDown={(e) => {
          if (e.key === "{" || e.key === "}") {
            e.preventDefault();
          }
        }}
        placeholder={placeholder}
        rows={rows}
        className="resize-y font-mono text-sm min-h-[150px]"
      />
      
      {/* Preview com badges */}
      {showPreview && value && (
        <div className="p-3 bg-muted/20 rounded-md border border-dashed min-h-[60px]">
          <div className="text-sm text-muted-foreground mb-1 font-medium">
            VisualizaÃ§Ã£o:
          </div>
          <div className="text-sm leading-relaxed">
            {renderPreview(value.replace(/{cumprimento}/g, getTimeBasedGreeting()))}
          </div>
        </div>
      )}
    </div>
  );
}








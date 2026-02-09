# AI System Reference Document

**⚠️ DOCUMENTO CRÍTICO - Consulte e atualize ao modificar qualquer componente relacionado à IA**

---

## 📋 Índice
1. [Arquitetura OpenAI Assistants API](#arquitetura-openai-assistants-api)
2. [Tabelas do Banco de Dados](#tabelas-do-banco-de-dados)
3. [Edge Functions](#edge-functions)
4. [Telas Frontend](#telas-frontend)
5. [Componentes](#componentes)
6. [Hooks](#hooks)
7. [Utilitários](#utilitários)
8. [Fluxo de Dados](#fluxo-de-dados)
9. [Ciclo de Vida das Threads](#ciclo-de-vida-das-threads)
10. [Sincronização Bidirecional](#sincronização-bidirecional)
11. [Tags Especiais](#tags-especiais)
12. [Regras de Negócio Críticas](#regras-de-negócio-críticas)
13. [Modelos Utilizados](#modelos-utilizados)
14. [Checklist de Mudanças](#checklist-de-mudanças)

---

## 🏗️ Arquitetura OpenAI Assistants API

O sistema utiliza a **OpenAI Assistants API** com um único Assistant global que gerencia todas as conversas. A arquitetura segue o padrão "Backend Orchestrator" onde:

- **1 Assistant Global**: Um único assistant configurado no Cérebro da IA
- **1 Conversa = 1 Thread**: Cada conversa WhatsApp mapeia para uma Thread na OpenAI
- **Backend como Orquestrador**: Backend controla quais tools/ações estão disponíveis em cada momento
- **Contexto Dinâmico**: Contexto de empresa/cliente é injetado via `additional_instructions` em cada Run

### Benefícios
- ✅ Memória de conversa 100% gerenciada pela OpenAI
- ✅ Sem necessidade de enviar histórico completo a cada mensagem
- ✅ Threads são limpas quando conversa é deletada
- ✅ Nova conversa = Thread nova = começa do zero

---

## 🗄️ Tabelas do Banco de Dados

### Configuração da IA
- **`company_ai_settings`**: Configurações da IA por empresa
  - `ai_enabled`, `ai_name`, `ai_personality_type`, `ai_personality`, `ai_tone`
  - `ai_instructions`, `greeting_message`, `greeting_show_always`
  - `escalation_tag`, `escalation_rules`, `escalation_sound_enabled`, `escalation_sound_type`
  - `urgency_tag`, `urgency_rules`, `urgency_sound_enabled`, `urgency_sound_type`
  - `ask_preferred_day`, `show_next_slots`, `scheduling_mode`
  - `use_function_calling` (feature flag para Assistants API)

### Prompt Master Global
- **`ai_master_prompt`**: Prompt master global (superuser)
  - `prompt` (text) — instruções do sistema
  - `model` (string) — modelo OpenAI (ex: gpt-4o-mini)
  - `temperature` (numeric) — criatividade (0-2)
  - `top_p` (numeric) — nucleus sampling (0-1)
  - `max_tokens` (integer) — limite de tokens por resposta
  - `state_expiration_minutes` (integer) — expiração do estado da conversa
  - `assistant_synced_at` (timestamp) — último push para OpenAI
  - `last_pulled_at` (timestamp) — último pull da OpenAI
  - `updated_at`, `updated_by`

### OpenAI Assistant
- **`openai_assistant`**: Referência do Assistant na OpenAI
  - `assistant_id` (string) — ID do assistant no OpenAI Platform (âncora imutável)
  - `name` (string) — nome do assistant
  - `model` (string) — modelo configurado
  - `created_at`, `updated_at`

### Threads de Conversa
- **`assistant_threads`**: Mapeamento conversa → thread OpenAI
  - `conversation_id` (uuid, FK) — conversa local
  - `thread_id` (string) — ID da thread na OpenAI
  - `company_id` (uuid, FK)
  - `created_at`
  - **CASCADE**: Ao deletar conversa, registro é removido automaticamente

### Estado da Conversa
- **`conversation_state`**: Estado determinístico da conversa
  - `conversation_id` (uuid, FK)
  - `company_id` (uuid, FK)
  - `stage` (string) — ex: "idle", "collecting_service", "confirming"
  - `collected_data` (jsonb) — dados coletados durante a conversa
  - `confirmed_facts` (jsonb) — fatos confirmados pelo cliente
  - `pending_action` (string) — ação aguardando confirmação
  - `has_previous_appointment`, `has_active_appointment` (boolean)
  - `expires_at` (timestamp) — sliding window de 30 min
  - `started_at`, `created_at`, `updated_at`

### FAQ
- **`company_faqs`**: Perguntas frequentes por empresa
  - `company_id`, `question`, `answer`, `summary`, `embedding`, `is_active`

### Logs e Uso
- **`ai_token_usage`**: Registro de uso de tokens
  - `company_id`, `tokens_used`, `model_used`, `operation_type`, `created_at`

- **`ai_prompt_logs`**: Logs de prompts enviados à IA
  - `company_id`, `contact_id`, `conversation_id`
  - `full_prompt`, `ai_response`, `model_used`
  - `tokens_input`, `tokens_output`, `tokens_total`
  - `response_time_ms`, `openai_raw_response`
  - `ai_config_snapshot`, `message_count`, `created_at`

### Credenciais Globais
- **`openai_settings`**: Chave API OpenAI (superuser)
  - `api_key` (encrypted), `updated_by`, `updated_at`

---

## ⚙️ Edge Functions

### Core - Assistants API

#### **`chat-ai-assistant`** ✅ (Principal)
- **Função**: Processa mensagens via OpenAI Assistants API
- **Fluxo**:
  1. Busca/cria Thread para a conversa
  2. Adiciona mensagem do cliente à Thread
  3. Determina ações permitidas (`determineAllowedActions`)
  4. Constrói tools dinâmicos (`buildDynamicTools`)
  5. Injeta contexto via `additional_instructions`
  6. Cria Run e aguarda conclusão
  7. Processa `tool_calls` se houver (handlers locais)
  8. Retorna resposta final
- **Tools disponíveis**:
  - `check_availability`: Consulta horários
  - `create_appointment`: Cria agendamento
  - `list_appointments`: Lista agendamentos do cliente
  - `cancel_appointment`: Cancela agendamento
  - `reschedule_appointment`: Reagenda
  - `escalate_to_human`: Escala para humano
- **Config**: `verify_jwt = false`

#### **`sync-assistant`** ✅ (Push: Sistema → OpenAI)
- **Função**: Sincroniza configurações do Cérebro da IA para OpenAI Platform
- **Campos sincronizados**: `name`, `instructions`, `model`, `temperature`, `top_p`
- **Ação**: Cria assistant se não existir, atualiza se existir
- **Atualiza**: `assistant_synced_at` no banco
- **Config**: `verify_jwt = false`

#### **`pull-assistant`** ✅ (Pull: OpenAI → Sistema)
- **Função**: Puxa configurações do OpenAI Platform para o sistema
- **Campos sincronizados**: `name`, `instructions`, `model`, `temperature`, `top_p`
- **Atualiza**: `ai_master_prompt` e `openai_assistant` no banco
- **Atualiza**: `last_pulled_at` no banco
- **Config**: `verify_jwt = false`

#### **`delete-thread`** ✅
- **Função**: Deleta Thread na OpenAI quando conversa é removida
- **Chamado por**: `useDeleteConversation` hook
- **Garante**: Não acumular threads órfãs no Platform
- **Config**: `verify_jwt = false`

### FAQ e Embeddings

#### **`generate-embedding`** ✅
- **Função**: Gera embedding OpenAI text-embedding-3-small (768 dimensões)
- **Uso**: FAQs
- **Config**: `verify_jwt = false`

#### **`generate-faq-summary`** ✅
- **Função**: Gera resumo otimizado de FAQ para embeddings
- **Config**: `verify_jwt = false`

#### **`search-faqs`** ✅
- **Função**: Busca FAQ por similaridade semântica
- **Config**: `verify_jwt = false`

### Processamento de Mídia

#### **`audio-transcription`** ✅
- **Função**: Transcreve áudios WhatsApp
- **Modelo**: whisper-1
- **Config**: `verify_jwt = false`

#### **`process-image`** ✅
- **Função**: Analisa imagens enviadas via WhatsApp
- **Modelo**: gpt-5-mini-2025-08-07 (vision)
- **Config**: `verify_jwt = false`

### Agendamentos

#### **`check-availability`** ✅
- **Função**: Verifica disponibilidade de horários
- **Config**: `verify_jwt = false`

### WhatsApp

#### **`zapi-webhook`** ✅
- **Função**: Recebe webhooks da Z-API e processa mensagens
- **Invoca**: `chat-ai-assistant` para mensagens inbound quando IA ativa
- **Requer**: `assistant_id` configurado (retorna erro se não configurado)
- **Config**: `verify_jwt = false`

#### **`zapi-send-message`** ✅
- **Função**: Envia mensagens via Z-API
- **Config**: `verify_jwt = false`

### Manutenção

#### **`send-scheduled-messages`** ✅
- **Função**: Envia mensagens agendadas (lembretes, follow-ups, aniversários)
- **Cron**: A cada hora
- **Config**: `verify_jwt = false`

#### **`verify-whatsapp-connections`** ✅
- **Função**: Verifica status das conexões WhatsApp
- **Cron**: A cada 5 minutos
- **Config**: `verify_jwt = false`

#### **`auto-mark-no-show`** ✅
- **Função**: Marca agendamentos como no-show automaticamente
- **Cron**: A cada 30 minutos
- **Config**: `verify_jwt = false`

#### **`reset-monthly-tokens`** ✅
- **Função**: Reseta tokens mensais das empresas
- **Cron**: Mensal
- **Config**: `verify_jwt = false`

---

## 🖥️ Telas Frontend

### Configuração da IA
- **`/company/ai-usage`** (`src/pages/company/AIUsage.tsx`)
  - Tab: **Geral** — Ativação IA, nome, personalidade, tom
  - Tab: **Escalação** — Tag e regras de escalação
  - Tab: **Urgência** — Tag e regras de urgência
  - Tab: **Agendamento** — Modo de agendamento
  - Tab: **Uso de Tokens** — Estatísticas
  - Tab: **Logs de Prompts** — Histórico

### Superuser - Cérebro da IA
- **`/superuser/ai-settings`** (`src/pages/superuser/AISettings.tsx`)
  - Tab: **Prompt Master** — Configuração global do Assistant
    - Nome do Assistant (sincronizado)
    - Instruções do sistema (prompt)
    - Modelo, Temperature, Top P, Max Tokens
    - Modo visualização/edição com pull-before-edit
  - Tab: **Blocos de Instrução** — Instruções condicionais
  - Tab: **Ações** — Definição de ações/tools
  - Tab: **Log de Prompts** — Logs globais

### FAQ
- **`/company/settings/faq`** — Gerenciamento de FAQs

---

## 🧩 Componentes

### Configuração IA
- **`MasterPromptTab`** — Editor do Prompt Master com sync bidirecional
- **`AIPersonalitySection`** — Personalidade e tom
- **`AISchedulingSection`** — Configurações de agendamento
- **`AIEscalationSection`** — Escalação para humano
- **`AIUrgencySection`** — Urgência
- **`AIUsageStats`** — Estatísticas de tokens
- **`AIPromptLogViewer`** — Logs de prompts
- **`AudioTranscriptionsChart`** — Gráfico de transcrições

### FAQ
- **`FAQDialog`** — Dialog para criar/editar FAQ

---

## 🪝 Hooks

### IA - Assistants API
- **`useMasterPrompt`** — Busca prompt master
- **`useUpdateMasterPrompt`** — Atualiza prompt master
- **`useOpenAIAssistant`** — Busca dados do assistant
- **`useSyncAssistant`** — Push: sistema → OpenAI
- **`usePullAssistant`** — Pull: OpenAI → sistema

### IA - Configuração
- **`useAIConfiguration`** — Configurações IA da empresa
- **`useAIPrerequisites`** — Validação de pré-requisitos
- **`useAIPromptLogs`** — Logs de prompts
- **`useAIUsage`** — Estatísticas de tokens

### FAQ
- **`useCompanyFaqs`** — CRUD de FAQs
- **`useGenerateEmbedding`** — Gera embeddings

### Conversas
- **`useConversations`** — CRUD de conversas
- **`useDeleteConversation`** — Deleta conversa + thread OpenAI

---

## 🛠️ Utilitários

- **`src/lib/ai-utils.ts`**
  - `isAIActive(aiDisabledUntil, contactTags)`: Verifica se IA está ativa

---

## 🔄 Fluxo de Dados da IA

```
Cliente envia mensagem via WhatsApp
        ↓
[zapi-webhook] recebe mensagem
        ↓
Salva em whatsapp_messages
        ↓
[processAIResponse] verifica isAIActive()
        ↓
Se IA ativa, invoca [chat-ai-assistant]
        ↓
[chat-ai-assistant]:
  1. Busca/cria Thread na OpenAI (assistant_threads)
  2. Adiciona mensagem ao Thread
  3. Determina allowed_actions via conversation_state
  4. Constrói tools dinâmicos
  5. Cria Run com additional_instructions:
     - [EMPRESA]: dados da empresa
     - [CLIENTE]: nome, telefone
     - [ESTADO]: stage, collected_data
     - [FATOS CONFIRMADOS]: confirmed_facts
     - [AÇÕES PERMITIDAS]: lista de tools
  6. Aguarda Run completar
  7. Se tool_calls, executa handlers e submete outputs
  8. Captura resposta final
        ↓
[zapi-send-message] envia resposta via Z-API
        ↓
Salva resposta em whatsapp_messages
        ↓
Log em ai_token_usage e ai_prompt_logs
```

---

## 🔄 Ciclo de Vida das Threads

```
┌─────────────────────────────────────────────────────────────┐
│                    CICLO DE VIDA DA THREAD                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📱 Cliente envia mensagem                                  │
│       ↓                                                     │
│  🔍 Busca thread existente (assistant_threads)              │
│       ↓                                                     │
│  ┌─ NÃO existe ──────────────────────────────────────┐     │
│  │  → Cria Thread nova na OpenAI                      │     │
│  │  → Salva thread_id em assistant_threads            │     │
│  └────────────────────────────────────────────────────┘     │
│  ┌─ JÁ existe ───────────────────────────────────────┐     │
│  │  → Usa Thread existente                            │     │
│  │  → OpenAI tem TODO o histórico automaticamente     │     │
│  └────────────────────────────────────────────────────┘     │
│       ↓                                                     │
│  🤖 Assistant processa com contexto COMPLETO                │
│       ↓                                                     │
│  📤 Resposta enviada                                        │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🗑️ Usuário apaga conversa                                  │
│       ↓                                                     │
│  1. Busca thread_id em assistant_threads                    │
│  2. Invoca [delete-thread] → DELETE na OpenAI               │
│  3. Deleta conversa no banco (CASCADE limpa tudo)           │
│       ↓                                                     │
│  ✅ Limpeza TOTAL - OpenAI + Banco                          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📱 Mesmo cliente manda mensagem de novo                    │
│       ↓                                                     │
│  🆕 Thread NOVA - Começa do ZERO                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Sincronização Bidirecional

O Cérebro da IA mantém sincronização bidirecional com o OpenAI Platform:

### Campos Sincronizados
| Campo | Banco | OpenAI |
|-------|-------|--------|
| Nome | `openai_assistant.name` | `assistant.name` |
| Instruções | `ai_master_prompt.prompt` | `assistant.instructions` |
| Modelo | `ai_master_prompt.model` | `assistant.model` |
| Temperature | `ai_master_prompt.temperature` | `assistant.temperature` |
| Top P | `ai_master_prompt.top_p` | `assistant.top_p` |

### Fluxo de Edição
```
1. Usuário clica "Editar"
        ↓
2. Sistema executa PULL (pull-assistant)
   - Busca dados atuais do Platform
   - Atualiza banco local
   - Atualiza last_pulled_at
        ↓
3. Formulário abre com dados atualizados
        ↓
4. Usuário faz alterações
        ↓
5. Usuário clica "Salvar e Sincronizar"
        ↓
6. Sistema salva no banco local
        ↓
7. Sistema executa PUSH (sync-assistant)
   - Envia alterações para Platform
   - Atualiza assistant_synced_at
        ↓
8. Volta para modo visualização
```

### Âncora Imutável
- `assistant_id` é a âncora que conecta banco ↔ OpenAI
- Nunca é alterado após criação
- Se assistant for deletado no Platform, sync-assistant cria novo

---

## 🏷️ Tags Especiais

- **`IA Desativada`**: Desativa IA permanentemente para o contato
- **`Aguardando Humano`**: Cliente solicitou falar com humano (IA continua até humano assumir)
- **`Urgente`**: Situação urgente detectada pela IA
- **`Aguardando Resposta`**: Humano assumiu a conversa (IA desativada por 60 min)

---

## ⚠️ Regras de Negócio Críticas

1. **Nunca inventar dados**: IA só trabalha com dados reais do banco
2. **Não-clientes**: Apenas podem agendar, não podem consultar/cancelar/reagendar
3. **Primeiro agendamento**: Boas-vindas especiais, orientar salvar número
4. **Escalação**: Tag "Aguardando Humano" + IA continua até humano clicar "Assumir"
5. **Thread = Conversa**: 1:1, deletar conversa = deletar thread
6. **Estado expira**: 30 min de inatividade reseta conversation_state
7. **Backend Orquestrador**: Backend decide quais tools disponíveis, não a IA

---

## 🤖 Modelos Utilizados

### OpenAI
- **`gpt-4o-mini`**: Modelo padrão para conversação (recomendado)
- **`gpt-4o`**: Modelo avançado (maior custo)
- **`gpt-5-nano-2025-08-07`**: Experimental (requer 4000+ max_tokens)
- **`gpt-5-mini-2025-08-07`**: Experimental + vision (requer 6000+ max_tokens)
- **`whisper-1`**: Transcrição de áudio
- **`text-embedding-3-small`**: Embeddings (768 dimensões)

---

## ✅ Checklist de Mudanças na IA

Ao modificar qualquer componente relacionado à IA, **CONSULTE E ATUALIZE ESTE DOCUMENTO**:

- [ ] Edge function criada/modificada → Atualizar seção "Edge Functions"
- [ ] Tabela criada/modificada → Atualizar seção "Tabelas"
- [ ] Hook criado/modificado → Atualizar seção "Hooks"
- [ ] Tela criada/modificada → Atualizar seção "Telas Frontend"
- [ ] Componente criado/modificado → Atualizar seção "Componentes"
- [ ] Novo modelo utilizado → Atualizar seção "Modelos"
- [ ] Nova tag especial → Atualizar seção "Tags Especiais"
- [ ] Nova regra de negócio → Atualizar seção "Regras Críticas"
- [ ] Mudança no fluxo → Atualizar diagrama "Fluxo de Dados"

---

**Última atualização**: 2025-12-16
**Versão**: 2.0 (OpenAI Assistants API)

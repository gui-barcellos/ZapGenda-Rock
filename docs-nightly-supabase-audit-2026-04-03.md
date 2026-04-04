# ZapGenda — auditoria noturna Supabase + dependências

Data: 2026-04-03
Projeto Supabase: `jiuzziiwigrjpavqopli`

## Escopo desta rodada
- inventário prático do uso de Supabase no repo
- mapa de dependências frontend -> tabelas / RPCs / Edge Functions
- riscos priorizados
- correções seguras e de baixo risco
- validação local viável

---

## 1. Inventário Supabase encontrado no repo

### 1.1 Banco / migrations
- Pasta: `supabase/migrations/`
- Migrations encontradas: **89**
- Tabelas identificadas por parsing das migrations: **64** entradas; **63 parecem reais** e **1 (`for`) é falso-positivo de parsing textual**.
- Tabelas com RLS habilitado: **63**
- Policies identificadas: **110**
- Funções SQL/RPC identificadas: **29**
- Triggers identificados: **16**

### 1.2 Tabelas principais por domínio

**Tenant / auth / perfis**
- `companies`
- `profiles`
- `user_roles`
- `company_settings`
- `company_ai_settings`
- `company_subscriptions`
- `supabase_settings`
- `feature_flags`

**Agenda / operação**
- `appointments`
- `availability`
- `blocked_slots`
- `services`
- `professionals`
- `service_professionals`
- `service_availability`

**CRM / contatos / chat**
- `contacts`
- `conversations`
- `conversation_state`
- `whatsapp_messages`
- `whatsapp_connections`
- `contact_memories`
- `crm_history`
- `crm_stages`
- `tag_registry`
- `tag_automation_rules`

**IA / prompts / uso**
- `ai_action_definitions`
- `ai_instruction_blocks`
- `ai_master_prompt`
- `ai_prompt_logs`
- `ai_token_usage`
- `audio_transcription_usage`
- `company_faqs`
- `openai_settings`
- `openai_assistant`
- `assistant_threads`
- `mpm_embeddings`
- `mpm_events`
- `mpm_chatLogs`

**Billing / Stripe**
- `plan_templates`
- `resource_prices`
- `payment_methods`
- `stripe_settings`
- `stripe_subscriptions`
- `subscription_changes`
- `invoices`

**Afiliados**
- `affiliates`
- `affiliate_companies`
- `affiliate_commissions`
- `affiliate_payouts`
- `affiliates_stripe`

**Admin / suporte / auditoria**
- `audit_logs`
- `support_tickets`
- `support_ticket_messages`
- `support_faqs`
- `system_logs`
- `user_invites`
- `resend_settings`
- `zapi_settings`
- `rate_limits`
- `scheduled_returns`
- `birthday_messages_log`
- `token_reset_history`
- `auto_message_templates`

### 1.3 RPCs / funções SQL mais relevantes
- `bootstrap_superuser`
- `superuser_exists`
- `has_role`
- `create_default_tags_for_company`
- `ensure_default_crm_stages`
- `update_contact_tags`
- `rename_tag_globally`
- `delete_tag_globally`
- `get_masked_api_key`
- `get_masked_resend_key`
- `get_masked_stripe_key`
- `get_masked_zapi_client_token`
- `search_contact_memories`
- `search_similar_events`
- `search_similar_faqs`

### 1.4 Edge Functions encontradas no repo
- `accept-user-invite`
- `affiliate-payout-pay`
- `affiliate-stripe-onboarding`
- `affiliate-stripe-refresh`
- `audio-transcription`
- `auto-mark-no-show`
- `chat-ai-responses`
- `check-availability`
- `create-checkout-session`
- `create-company`
- `create-subscription`
- `delete-company`
- `expire-pending-conversations`
- `generate-affiliate-commissions`
- `generate-affiliate-payouts`
- `generate-embedding`
- `generate-faq-summary`
- `process-image`
- `process-pending-ai`
- `reset-monthly-tokens`
- `search-faqs`
- `send-admin-password-reset`
- `send-auth-email`
- `send-scheduled-messages`
- `send-user-invite`
- `stripe-webhooks`
- `suspend-overdue-companies`
- `sync-stripe-products`
- `verify-whatsapp-connections`
- `zapi-create-instance-disabled` (legado/desabilitado)
- `zapi-fetch-profile-picture`
- `zapi-phone-code`
- `zapi-qr-code`
- `zapi-send-message`
- `zapi-validate-connection`
- `zapi-webhook`

### 1.5 Secrets / envs usados pelas Edge Functions

**Base Supabase**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY` (somente algumas functions)

**URL da aplicação**
- `APP_URL` (`create-company`, `send-admin-password-reset`, `send-user-invite`)

**Credenciais de terceiros não vêm de env de function; vêm do banco**
- OpenAI/Z.AI: `openai_settings.api_key`
- Stripe: `stripe_settings`
- Z-API: `whatsapp_connections`

### 1.6 Scheduler / cron
Estado real do repo hoje:
- `supabase/config.toml` **não possui mais blocos de scheduler ativos**.
- O arquivo traz comentário explícito: scheduler blocks foram removidos para compatibilidade do CLI atual e devem ser reaplicados depois.

Implicação:
- existe desenho funcional para jobs recorrentes
- mas **o repo atual não expressa cron ativo em `config.toml`**
- portanto produção depende de configuração manual/documentada fora desse arquivo

Jobs esperados pela documentação/produto:
- `reset-monthly-tokens`
- `verify-whatsapp-connections`
- `auto-mark-no-show`
- `send-scheduled-messages`
- `expire-pending-conversations`
- `generate-affiliate-commissions`
- `generate-affiliate-payouts`
- `suspend-overdue-companies`

---

## 2. Mapa de dependências frontend -> Supabase

### 2.1 Hooks críticos

**Agenda**
- `useAppointments` -> `appointments`, `availability`, `blocked_slots`, `company_settings`, `professionals`, `service_availability`, `service_professionals`, `services`, `audit_logs`
- `useAvailability` -> `availability`, `blocked_slots`, `professionals`, `profiles`
- `useProfessionals` -> `professionals`, `availability`, `blocked_slots`, `service_professionals`, `services`
- `useServices` -> `services`, `service_professionals`, `profiles`
- `useServiceAvailability` -> `service_availability`, `service_professionals`, `profiles`
- `useSchedulingRules` -> `company_settings`, `audit_logs`, `profiles`

**CRM / chat / WhatsApp**
- `useContacts` -> `contacts`
- `useContactTags` -> `contacts`, `profiles`
- `useTags` -> `contacts`, `profiles`
- `useConversations` -> `conversations`, `contacts`, `whatsapp_messages`, `whatsapp_connections`, `ai_prompt_logs`, `audio_transcription_usage`
- `useMessages` -> `whatsapp_messages`, `whatsapp_connections`, function `zapi-send-message`
- `useConversationRealtime` -> `system_logs` + realtime em `conversations` e `whatsapp_messages`
- `useConnectedWhatsApp` -> `whatsapp_connections`
- `useWhatsAppConnections` -> `whatsapp_connections`, `profiles`, function `zapi-validate-connection`
- `useSuperUserZAPI` -> `whatsapp_connections`, function `zapi-validate-connection`

**IA / conhecimento**
- `useAIChat` -> function `chat-ai-responses` (**corrigido nesta rodada; antes apontava para `chat-ai` inexistente**)
- `useAIConfiguration` -> `company_ai_settings`, `profiles`
- `useAIPrerequisites` -> `availability`, `companies`, `company_ai_settings`, `company_settings`, `professionals`, `profiles`, `services`
- `useAIUsage` -> `ai_token_usage`, `audio_transcription_usage`, `company_subscriptions`, `profiles`
- `useAIPromptLogs` -> `ai_prompt_logs`
- `useCompanyFaqs` -> `company_faqs`, functions `generate-embedding`, `generate-faq-summary`
- `useOpenAISettings` -> `openai_settings`, RPC `get_masked_api_key`
- `useMasterPrompt` -> `ai_master_prompt`
- `useActionDefinitions` -> `ai_action_definitions`
- `usePromptInjections` -> `ai_prompt_injections`

**Billing / subscription**
- `useBillingStatus` -> `invoices`, `profiles`
- `useInvoices` -> `invoices`
- `useSubscriptions` -> `company_subscriptions`, `plan_templates`, `resource_prices`, `subscription_changes`, `profiles`
- `useStripeSettings` -> `stripe_settings`, RPC `get_masked_stripe_key`
- `pages/company/setup/Payment.tsx` -> `companies`, `profiles`, function `create-checkout-session`

**Admin / superuser**
- `useCompanies` -> `companies`, `affiliate_companies`, functions `create-company`, `delete-company`, `send-admin-password-reset`
- `useCompanyUsers` -> `companies`, `profiles`, `user_roles`, function `send-user-invite`
- `useAffiliates` -> `affiliates`, `affiliate_companies`, `affiliate_commissions`, `affiliate_payouts`
- `useSuperuserAffiliates` -> `affiliates`, `affiliate_companies`, `affiliate_commissions`, `affiliate_payouts`, function `affiliate-payout-pay`
- `useAuditLogs` -> `audit_logs`
- `useSupportTickets` -> `support_tickets`, `support_ticket_messages`, `profiles`
- `useSupabaseSettings` -> `supabase_settings`
- `useZAPISettings` -> `zapi_settings`, RPC `get_masked_zapi_client_token`
- `useResendSettings` -> `resend_settings`, RPC `get_masked_resend_key`

### 2.2 Telas / pontos de entrada relevantes
- `pages/SetupSuperUser.tsx` -> `user_roles`, RPC `bootstrap_superuser`
- `pages/AcceptInvite.tsx` -> function `accept-user-invite`
- `pages/company/settings/WhatsAppConnection.tsx` -> functions `zapi-phone-code`, `zapi-qr-code`
- `pages/company/CRM.tsx` -> RPC `ensure_default_crm_stages`
- `pages/Login.tsx` -> `companies`, `invoices`, `payment_methods`, `user_roles`

---

## 3. O que já está pronto / maduro
- base de schema Supabase ampla e relativamente madura
- multi-tenant com `companies`, `profiles`, `user_roles`
- RLS amplamente presente
- Edge Functions cobrem IA, chat, billing, afiliados, onboarding e automações
- chat em tempo real e persistência de mensagens estão integrados no frontend
- fluxo de bootstrap de superuser existe no banco e na UI
- integração frontend local com projeto Supabase já estava configurada (`.env.local`)

---

## 4. Riscos priorizados

### P0 — precisa validar antes de confiar em produção
1. **Scheduler não está codificado no `config.toml` atual**
   - risco: jobs críticos não rodarem ou ficarem dependentes de configuração manual esquecida
2. **Secrets de terceiros fora do repo e parcialmente no banco**
   - risco: functions implantadas mas falhando em runtime por falta de `APP_URL`, chaves Stripe/Z-API/AI ou secrets Supabase
3. **Cobertura e consistência real de RLS não validada contra ambiente remoto**
   - o repo mostra intenção forte, mas sem auditoria remota não dá para afirmar que o projeto em produção está 100% alinhado às migrations

### P1 — alto impacto funcional
4. **Drift entre nomes de Edge Functions e frontend**
   - caso real encontrado: `useAIChat` chamava `chat-ai` mas a function do repo é `chat-ai-responses`
5. **Documentação estava afirmando cron ativo no `config.toml`, mas o arquivo atual não confirma isso**
   - risco operacional de falso senso de cobertura
6. **Dependência forte de storage/configuração externa para fluxo WhatsApp/Z-API**
   - qualquer inconsistência em `whatsapp_connections`, webhook ou tokens quebra chat vivo e mensagens automáticas

### P2 — acompanhamento
7. **Funções e tabelas legadas/nomes históricos ainda aparecem em docs e comentários**
   - ex.: referências históricas a `chat-ai-assistant`, `chat-ai`, `zapi-disconnect`
8. **Inventário de scheduler/remote secrets ainda é documental, não auditado via API/dashboard**
   - faltou acesso remoto autenticado ao projeto para confirmar estado real no painel

---

## 5. Ordem segura de validação recomendada
1. **Banco remoto vs repo**
   - confirmar migrations aplicadas
   - confirmar existência das tables/RPCs críticas no projeto remoto
2. **Secrets**
   - validar `SUPABASE_*`, `APP_URL` e presença das credenciais operacionais no banco
3. **Auth/RLS**
   - smoke por papéis: `superuser`, `admin`, `attendant`, `affiliate`
4. **WhatsApp/Z-API**
   - validar `zapi-validate-connection`, QR/phone code, envio real e webhook inbound
5. **IA**
   - validar `chat-ai-responses`, `process-pending-ai`, FAQ embeddings e consumo de tokens
6. **Billing/Stripe**
   - validar checkout, webhook e suspensão por inadimplência
7. **Cron**
   - reaplicar/confirmar scheduler real somente depois de validar as functions base

---

## 6. Correções seguras feitas nesta rodada

### 6.1 Corrigido drift de function no frontend
Arquivo:
- `src/hooks/useAIChat.tsx`

Mudança:
- de `supabase.functions.invoke("chat-ai")`
- para `supabase.functions.invoke("chat-ai-responses")`

Motivo:
- `chat-ai` não existe no diretório atual de Edge Functions
- `chat-ai-responses` é a function real usada também por `zapi-webhook` e `process-pending-ai`

### 6.2 Documentação alinhada ao estado real do repo
- esta auditoria registra explicitamente que o `config.toml` atual **não** contém mais blocos ativos de scheduler

---

## 7. Pendências claras após esta rodada
- auditar estado remoto real do projeto Supabase (tabelas/RPCs/policies/functions/scheduler/secrets) com acesso autenticado ao ambiente
- decidir fonte canônica do scheduler: dashboard/manual x repo/CLI
- revisar docs antigas para eliminar referências históricas confusas (`chat-ai`, `chat-ai-assistant`, etc.)

---

## 8. Validação local desta rodada
- build/lint em execução ou a confirmar no momento da auditoria
- correção aplicada foi de baixo risco e estritamente de alinhamento de nome de function

---

## 9. Conclusão operacional
O projeto já tem bastante infra Supabase pronta, mas ainda existe risco operacional em três frentes: scheduler não versionado no config atual, dependência forte de secrets/dados externos e possibilidade de drift entre frontend/docs e functions reais. A correção feita nesta rodada removeu um drift funcional real na integração de IA e deixou o estado do repo mais honesto para a próxima validação ponta a ponta.

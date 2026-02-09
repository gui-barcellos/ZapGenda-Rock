# ZapGenda - System Requirements (Working Spec)

Last updated: 2026-02-03
Owner decisions: Confirmed in chat

## Product Goal
Automate WhatsApp-based appointment scheduling for health and aesthetics clinics. Multitenant SaaS with AI acting like a human assistant (conversational, not bot-like). IA must only act on explicit user intent.

## Affiliate Program (Manual)
- Affiliates are created manually by superuser/team. No self-signup.
- Two dashboards: superuser affiliate dashboard (global) and affiliate dashboard (per affiliate).
- Affiliate earnings tracked and paid via Stripe Connect (not Stripe Billing).
- Payouts only after explicit status (approved/eligible) and manual review if needed.
 - Affiliate has a mini dashboard to:
   - Connect their Stripe account (preferred payout method).
   - See their client companies.
   - See commission per client and total.
 - Superuser dashboard must show:
   - Which company belongs to which affiliate.
   - Each affiliate and their companies + totals.

## Core Rules (Non-Negotiable)
- No WhatsApp buttons. All messages are plain text.
- IA must require explicit confirmation for actions (no implicit assumptions).
- No auto-cancel for silence.
- If appointment created < 24h ahead, send no confirmation/reminder.
- Company chooses its own timings and message texts; defaults exist.
- Timezone is per company (not per professional).
- Language is per company. MVP in PT-BR; system prepared for multi-language (PT/ES/EN + future).

## Scheduling Rules (Existing in CliniFlow)
These already exist and must be respected in ZapGenda:
- min_advance_hours / max_advance_days
- min_advance_hours_ai / max_advance_days_ai
- min_advance_hours_manual / max_advance_days_manual
- scheduling_mode: rolling | monthly
- open_next_month_on_day, months_ahead_visible
- opening_type: date_range | week_defined
- opening_start_day, opening_end_day, opening_week
- auto_mark_no_show_enabled, auto_mark_no_show_hours

## No-Show Auto-Mark (Company Setting)
If enabled:
- After the appointment end time, if the assistant did not manually set status to "completed", the system automatically sets status to "no_show".
If disabled:
- The status remains whatever it was (confirmed or pending).

## Automated Messages (All customizable per company)
### Required types
1) Appointment confirmation (default 72h before)
2) Appointment reminder (default 24h before)
3) Post-appointment (attended) follow-up
4) Post-appointment (missed/no-show) follow-up
5) Rescheduling due to internal blocking
6) Scheduled return reminder
7) Birthday message

### Behavior
- Max 2 automated messages per appointment (confirmation + reminder).
- If patient ignores both, appointment stays scheduled.
- If patient says "no" to confirmation, system asks about rescheduling.
- Only explicit responses change status.

### Variable Tokens (Insert-only, protected)
- Tokens can be inserted via button in the SaaS editor.
- Tokens cannot be typed or pasted.
- Tokens can be deleted.
- Pasting text strips tokens.

Canonical token set (EN, always):
- {{client_name}}
- {{company_name}}
- {{date}}
- {{weekday}}
- {{time}}
- {{professional_name}}
- {{service_name}}
- {{company_phone}} (optional)

UI labels for tokens are localized per company language.

### Formatting
- Date: DD/MM/YYYY
- Day of week: "Quinta-feira" (full)
- Time: 24h (HH:MM)

## Appointment Status
- scheduled: pending confirmation ("Aguardando Confirmação")
- confirmed
- completed
- cancelled
- no_show

Rules:
- Silence does NOT change status.
- Only explicit user intent changes status.

## Conversation Rules (Human-like)
- Always ask and wait for explicit confirmation.
- If response is ambiguous, ask again.
- If "no", ask if they want to reschedule or cancel.
- Cancellation only happens after explicit cancel intent (e.g., "quero cancelar", "preciso cancelar", "não vou poder ir") AND the user confirms "cancelar" when asked.

## WhatsApp Integration
- Provider: Z-API
- All outgoing messages are text only.
- System must keep working even if user does not reply.
- Z-API instance creation:
  - Auto-creation is documented but disabled.
  - Superuser creates instance manually in Z-API panel.
  - Superuser saves Instance ID + Token per company (and global Client Token if required).
- Clinic connection modes (company-facing screen):
  - QR Code connection (image-based).
  - Phone number connection (code delivered to WhatsApp number).
- Z-API endpoints used for connection:
  - GET /qr-code/image
  - GET /phone-code/{phone}
- Z-API QR Code expiration is short; screen should support refresh.
- Z-API QR Code invalidates about every 20s; refresh window 10-20s recommended with manual fallback after a few attempts.
- Z-API requests use Client-Token header when configured.
- Phone-code flow: system requests a code for a specific phone and user enters it in WhatsApp "Connect with phone number".

## Live Chat (WhatsApp Mirror)
- The live chat screen must mirror WhatsApp exactly.
- Every system message sent to the client must appear in the live chat.
- No extra messages, no missing messages.
- Allowed indicator: mark messages as "automatic".
- No chat buttons; only plain text messages.
- Automated messages appear in the live chat as outbound messages (same as IA/human).
- Messages only disappear if the conversation history is cleared.

### Live Chat UI Actions (Current)
Header:
- Silence urgent alerts.
- Toggle sound alerts.
- Open contact profile (name click).
- Open profile picture (avatar click).
- AI controls: assume conversation (temporary disable), reactivate, disable permanently.
- Favorite/unfavorite conversation.

Sidebar:
- Filter tabs: all / unread / favorites.
- Start conversation with phone number.
- Create new contact.
- Select conversation.

Conversation actions (menu):
- Mark read/unread.
- Favorite/unfavorite.
- Block/unblock contact.
- Delete conversation.

Chat input:
- Attach (placeholder).
- Emoji (placeholder).
- Send message.

## Required Changes (from current codebase)
1) Message type mismatch:
   - UI uses message_type "pre_appointment".
   - Cron uses "pre_appointment_reminder".
   - Must unify into:
     - appointment_confirmation
     - appointment_reminder
2) Add separate sent markers:
    - confirmation_sent_at
    - reminder_sent_at
    - migrate/replace existing confirmation_sent + pre_reminder_sent_at
3) Cron logic updates:
   - Respect company timezone.
   - Send confirmation 72h before (default).
   - Send reminder 24h before (default).
   - Skip if appointment created < 24h before start.
4) Token placeholder consistency:
   - Replace {serviço} vs {servico} mismatch.
   - Adopt canonical {{token}} format in UI/storage and map to runtime replacements.
5) Language support foundation:
   - company_settings.language
   - company_settings.timezone
   - templates stored per company + language
6) Explicit response parser:
   - Intent-based (not exact keywords). Must handle typos and mixed intent.
   - If message contains both confirm and cancel intent (e.g., "sim quero cancelar"), cancel intent wins.
   - Confirm intent => status confirmed.
   - Cancel intent => ask "reagendar ou cancelar?" and only cancel after explicit "cancelar".
   - Reschedule intent => continue scheduling flow (IA).
   - Ambiguous => ask again.
7) Status mismatch in post-attended follow-up:
   - Frontend uses status "completed".
   - Cron uses status "attended".
   - Must align to a single status ("completed").
8) Existing toggles in company_settings:
   - send_confirmation_messages
   - send_birthday_messages
   - scheduled_return_reminder_days

## UX Requirements (Messages Editor)
- Token insert buttons (chips) with labels.
- Live preview (sample data).
- Tokens are protected inline elements.
- No token paste; pasted content is plain text.

## Defaults (Editable by company)
- Confirmation timing: 72h
- Reminder timing: 24h
- No last reminder

## Default PT-BR Templates (MVP)
Use the existing system texts (as in current UI/print):

1) Appointment confirmation
Olá, {{client_name}}! Tudo bem com você?
Passando pra confirmar seu horário: {{date}} às {{time}} com {{professional_name}} ({{service_name}}).
Pode me confirmar se está tudo certo?
Caso precise remarcar, sem problema — é só avisar por aqui!

2) Post-appointment (attended)
Olá, {{client_name}}.
Aqui na {{company_name}}, prezamos sempre pelo seu bem-estar e pela qualidade do atendimento.
Poderia nos contar como foi sua experiência com {{professional_name}}?

3) Post-appointment (missed/no-show)
Olá, {{client_name}}.
Verificamos que você não pôde comparecer ao seu horário em {{date}} às {{time}}.
Caso deseje reagendar, nossa equipe da {{company_name}} está à disposição para encontrar um novo horário conveniente.

4) Rescheduling due to internal blocking
Olá, {{client_name}}.
Por motivo de ajuste interno, precisaremos reagendar sua consulta marcada para {{date}} às {{time}} com {{professional_name}}.
Podemos verificar juntos um novo horário que fique melhor para você?
Basta responder por aqui e já te mostro as opções disponíveis.
Agradecemos pela compreensão.
{{company_name}}

5) Scheduled return reminder
Olá, {{client_name}}! Como você está?
Aqui é da {{company_name}}. Tá na hora de cuidar de você de novo!
Que tal agendar seu retorno para {{service_name}} com {{professional_name}}?
Me avisa por aqui e já vejo os melhores horários pra você.

6) Birthday message
Ei, {{client_name}}! Hoje é o seu dia!
A equipe da {{company_name}} te deseja um aniversário cheio de alegria, boas risadas e gente que te faz bem.
Que o dia renda bons momentos — e que o ano venha leve, produtivo e cheio de vitórias.
Parabéns!

7) Appointment reminder (24h)
Olá, {{client_name}}! Passando pra lembrar da sua consulta dia {{date}} ({{weekday}}) às {{time}} com {{professional_name}}.
Se precisar ajustar o horário, é só me avisar por aqui.

## Data Model Additions (Proposed, approved)
Company settings:
- confirmation_hours (default 72)
- reminder_hours (default 24)
- language (default pt-BR)
- timezone (IANA string, e.g., America/Sao_Paulo)

Appointments:
- confirmation_sent_at
- reminder_sent_at

## Future: Google Calendar Sync
- Per-professional OAuth.
- Two-way sync (events created/updated/cancelled).
- Conflict resolution policy (TBD).

## Open Questions (Need decisions later)
- Exact wording default templates per language (ES/EN).
- Whether to log all automated message deliveries for analytics.
 - 2FA/MFA enforcement (SMS vs TOTP vs WebAuthn) and rollout policy.

## Message Delivery Logs (Decision)
- Keep full log of automated messages.
- Automated messages are stored as chat messages (outbound).
- Automated messages only disappear if the conversation history is cleared.

## Billing (Overdue Policy)
- Grace period: 7 days after due date.
- During grace period: full access, show warning banner about pending payment and upcoming block.
- After grace period: block access and send user to payment page on login.

## AI Usage Limits (Decision)
- No limits for now (MVP).

## Post-MVP (Planned Actions)
- Z-API auto instance creation (activate when contract allows).
- Google Calendar sync.
- Multi-language system (ES/EN + future).

## Affiliate Data Model (Proposed)
- affiliates: id, name, email, phone, status (active/suspended), created_at
- affiliate_clients: affiliate_id, company_id, joined_at, status
- affiliate_commissions: affiliate_id, company_id, invoice_id, amount, currency, status (pending/approved/paid), period_start, period_end, created_at
- affiliate_payouts: affiliate_id, amount, currency, status, stripe_payout_id, created_at
- affiliates_stripe: affiliate_id, stripe_account_id, charges_enabled, payouts_enabled, onboarding_status

## Affiliate Rules (Draft)
- Commission model: % of subscription revenue (configurable) with duration in months (editable).
- Default duration: 12 months (editable).
- Only paid invoices generate commission.
- Refunds/chargebacks claw back commission.
- Payout cadence: monthly automatic once minimum threshold reached.
 - Commission continues only while the company is active and paying.
 - If company cancels, affiliate can see cancellation status and history.

## Stripe Connect (Decision)
- Use Stripe Connect Express for affiliate payouts.

## Audit Logs (Approved)
Purpose: track who did what and when for critical actions.
Minimum events:
- Appointment cancelled (who, when, reason, source)
- Appointment rescheduled (before/after)
- Manual status change
- Scheduling rules changes
- Auto message template changes

Proposed table: audit_logs
- id, company_id, actor_user_id, actor_type (user/system/ai), action, entity_type, entity_id
- payload_before, payload_after, reason, created_at

## Data Security & LGPD (Critical)
Security is shared responsibility. Supabase provides infrastructure security, but ZapGenda is responsible for correct configuration, access control, and data handling. We must treat this as a first-class requirement.

### Data Segregation (Multi-tenant)
- All tenant data must be filtered by `company_id`.
- RLS must enforce tenant isolation on every table containing tenant data.
- No public table should expose multi-tenant data without `company_id` scoping.

### Roles & Access Control
- Roles: `superuser`, `admin`, `attendant`, `affiliate`.
- Principle of least privilege: only grant the minimum permissions required.
- Superuser is the only role with global access.
- Affiliate is strictly read-only and scoped to affiliate-related entities.
- Never allow privileged writes from client without RLS policy.

### MFA/2FA Policy (Decision)
- **SuperUser**: TOTP (Google Authenticator) + backup codes.
- **Admin**: TOTP + backup codes.
- **Attendant**: TOTP only (no backup codes; admin can recreate account).
- **Affiliate**: TOTP + backup codes.
- "Remember device" enabled with expiry **30 days**. New devices require 2FA.

### Account Recovery (Decision)
- If Admin/Affiliate loses password, backup codes, and TOTP:
  1) Human verification by support.
  2) Superuser authorizes reset.
  3) User sets new password and re-enrolls 2FA.
- Provide a **UI button** for:
  - Company Admin: “Perdi acesso / Resetar 2FA”.
  - Affiliate: “Perdi acesso / Resetar 2FA”.
  - These actions open a support flow (manual approval required).
- Password recovery **Stage 1**: email reset link.
- If email reset is not possible, fall back to support verification flow above.
 - If user loses **everything** (email, password, 2FA, backup codes):
   - Recovery only via **live video call** with support.
   - Call must be recorded and stored as proof.
   - Request must be made by the **contract owner** (responsável pelo contrato).
   - After approval: reset login email, force new password, and re-enroll 2FA.

### RLS & Policies
- RLS enabled on all business tables.
- Policies reviewed anytime schema changes are made.
- Bootstrap superuser allowed ONLY if no superuser exists.
- Store policy changes via migrations (no manual edits in production).

### Secrets & Keys
- Frontend uses anon key only.
- Edge Functions use `SUPABASE_SERVICE_ROLE_KEY` via secrets.
- Third-party keys (Stripe, Z-API, AI) stored in DB and/or secrets.
- Never expose service role key in client or logs.
- Rotate keys on any suspicion or after team member offboarding.

### Audit & Traceability
- All critical actions must be logged: cancel, reschedule, manual status change, billing changes, and message template updates.
- Logs must include actor, entity, before/after payload, and timestamp.
- Logs are read-only for non-superusers.

### Backups & Recovery
- Use Supabase automated backups.
- Define recovery steps for:
  - Accidental delete
  - Data corruption
  - RLS misconfiguration

### Incident Response (Data Leak)
- Identify scope: which tables, which tenant(s), time window.
- Revoke/rotate keys immediately.
- Freeze affected access (if required).
- Generate audit report from `audit_logs` and access logs.
- Notify affected clients per LGPD.

### LGPD (Brazil)
- ZapGenda acts as data processor; clinics are data controllers.
- Maintain:
  - Terms explaining data handling
  - Ability to delete/export customer data on request
  - Retention policy (to be defined)

### Developer Checklist (Before Deploy)
- [ ] RLS policies updated for new tables/columns
- [ ] No service role key in frontend or public logs
- [ ] Edge Functions secrets configured
- [ ] Realtime enabled only on required tables
- [ ] Migrations applied and verified
- [ ] MFA/2FA enforced for all roles (including SuperUser)

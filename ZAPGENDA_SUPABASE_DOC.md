# ZapGenda - Supabase Documentation

Last updated: 2026-03-12

This document describes how ZapGenda uses Supabase (database, auth, RLS, edge functions, and scheduler) so a developer can maintain the system without reverse‑engineering.

---

## 1) Project Overview
- Supabase project ref: `jiuzziiwigrjpavqopli`
- Project URL: set in `VITE_SUPABASE_URL` (frontend `.env`)
- Primary data store: Postgres (schema managed by migrations)
- Auth provider: Supabase Auth (email/password)
- Serverless backend: Supabase Edge Functions
- Realtime: used for live chat (conversations + messages)
- Scheduler: used for cron jobs (tokens reset, reminders, no‑show, affiliate payouts, etc.)

---

## 2) Environments / Keys

### Frontend (Vite)
Configured in `.env.local` (preferred for local dev) or `.env` at project root:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` (anon key)
- `VITE_SUPABASE_PROJECT_ID`

If these are missing, the frontend now shows a configuration warning instead of failing with a blank screen.

### Edge Functions (Supabase Secrets)
Set in Supabase → Project Settings → Edge Functions → Secrets:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY` (required for some functions: affiliate + QR/phone helpers)

### Third‑party credentials (stored in DB)
These are read from tables, not from environment:
- OpenAI/Z.AI key: `openai_settings.api_key`
- Stripe keys/webhook: `stripe_settings` table (api_key, webhook_secret, etc.)
- Z‑API credentials: `whatsapp_connections` table (instance_id, token, client_token, etc.)

---

## 3) Auth & Roles

### Roles (enum)
`app_role`: `superuser`, `admin`, `attendant`, `affiliate`

### Role storage
`user_roles` table holds roles for each user, per company when applicable.

### Helper functions
- `has_role(user_id, role)` - used in RLS policies
- `superuser_exists()` - checks if any superuser exists
- `bootstrap_superuser(p_user_id)` - allows first superuser creation when RLS blocks

### Bootstrap superuser
UI route: `/setup-superuser`
If RLS blocks insert, the app calls `bootstrap_superuser()` to create the first superuser.

---

## 4) Database (Schema & Migrations)

### Source of truth
All schema changes live in `supabase/migrations`.  
Do not edit the database manually unless documented; create a new migration instead.

### Core data domains (high level)
- **Companies / Settings:** `companies`, `company_settings`, `company_ai_settings`
- **Users / Roles:** `profiles`, `user_roles`
- **Services & Professionals:** `services`, `professionals`, `professional_services`
- **Scheduling:** `appointments`, `appointment_status` logic, no‑show automation
- **Contacts & CRM:** `contacts`, `conversations`, `whatsapp_messages`, `tags`
- **Automation:** `auto_messages`, `ai_prompt_logs`, `ai_prompt_injections`
- **Billing:** `plans`, `subscriptions`, `invoices`, `stripe_settings`
- **Affiliates:** `affiliates`, `affiliate_companies`, `affiliate_commissions`, `affiliate_payouts`, `affiliates_stripe`
- **Audit:** `audit_logs`

### Recent critical migrations (ZapGenda‑specific)
- Affiliate + audit logs + messaging fields migration
  - `20260203120000_zapgenda_affiliates_audit_and_messages.sql`
- Superuser audit policy migration
  - `20260205123000_add_audit_logs_superuser_policy.sql`
- Affiliate commissions unique constraint
  - `20260205124500_affiliate_commissions_unique.sql`
- Affiliate payout id column
  - `20260205133000_affiliate_commissions_payout_id.sql`
- Bootstrap superuser policy
  - `20260207140000_bootstrap_superuser_policy.sql`
- Bootstrap superuser RPC
  - `20260207141000_bootstrap_superuser_rpc.sql`

---

## 5) RLS & Policies (High‑Level)
RLS is enabled on most tables. Policies are role‑based using `has_role()`.

Key behavior:
- Superuser can read/admin across companies.
- Company users can only read/write within their company.
- Affiliate has read‑only visibility for affiliate‑scoped entities.
- `bootstrap_superuser` policy allows the **first** superuser insert only.

If you see RLS errors, check:
- user role in `user_roles`
- policy existence on the target table
- whether `auth.uid()` is available (must be logged in)

---

## 6) Edge Functions (Deployed)
All functions are deployed to the project.

### Messaging / WhatsApp / Live Chat
- `zapi-webhook` - receives incoming messages from Z‑API
- `zapi-send-message` - outbound messaging (also used by scheduled sends)
- `zapi-qr-code` / `zapi-phone-code` - connection helpers
- `zapi-validate-connection` - status check
- `zapi-fetch-profile-picture` - contact metadata
- `verify-whatsapp-connections` - periodic health check
- `expire-pending-conversations` - expire stale AI workflows

### Scheduling / Automation
- `check-availability` - time slots
- `send-scheduled-messages` - confirmation/reminder/birthday/etc.
- `auto-mark-no-show` - no‑show automation

### AI / Knowledge
- `chat-ai-responses` - main AI orchestrator
- `process-pending-ai` - handles pending AI work
- `audio-transcription` - voice → text
- `process-image` - image analysis
- `generate-embedding`, `search-faqs`, `generate-faq-summary`

### Billing / Stripe / Affiliates
- `create-checkout-session`
- `create-subscription`
- `stripe-webhooks`
- `sync-stripe-products`
- `affiliate-stripe-onboarding`
- `affiliate-stripe-refresh`
- `generate-affiliate-commissions`
- `generate-affiliate-payouts`
- `affiliate-payout-pay`
- `suspend-overdue-companies`

### Admin / Utility
- `create-company`, `delete-company`
- `send-user-invite`, `send-auth-email`
- `send-admin-password-reset`
- `accept-user-invite`
- `reset-monthly-tokens`

---

## 7) Scheduler (Cron Jobs)
Defined in `supabase/config.toml` (edge runtime scheduler blocks).

Current scheduled jobs:
- `reset-monthly-tokens` (monthly)
- `verify-whatsapp-connections` (every 5 min)
- `auto-mark-no-show` (every 30 min)
- `send-scheduled-messages` (hourly)
- `expire-pending-conversations` (every 1 min)
- `generate-affiliate-commissions` (daily)
- `generate-affiliate-payouts` (monthly)
- `suspend-overdue-companies` (daily)

Note: Scheduler must be enabled in Supabase Dashboard for production.

---

## 8) Deployment (Supabase CLI)

### Apply migrations
```
supabase db push
```

### Deploy all functions
```
supabase functions deploy <function-name>
```

For the latest onboarding/invite changes, deploy at minimum:
```
supabase functions deploy accept-user-invite
supabase functions deploy create-company
supabase functions deploy send-admin-password-reset
```

Tip: deploy in batch via a script or loop if needed.

---

## 9) Known Local Dev Pitfalls
- PowerShell blocks `npm.ps1`/`npx.ps1` by default → use `npm.cmd`/`npx.cmd`.
- Google Drive paths can cause `npm install` failures → use a local folder for node_modules.
- Some SQL files may require BOM removal if SQL parser fails.

---

## 10) What’s Missing (Secrets)
Backend is deployed but needs secrets set for:
- Stripe
- Z‑API
- AI provider

Without these, the functions exist but will error at runtime.

---

## 11) Maintenance Checklist (Quick)
- [ ] Auth settings (email confirmation on/off)
- [ ] RLS policies still valid after schema changes
- [ ] Edge Functions deployed after any update
- [ ] Scheduler enabled for cron jobs
- [ ] Stripe/Z‑API/AI secrets configured
- [ ] Realtime enabled for `conversations` and `whatsapp_messages`


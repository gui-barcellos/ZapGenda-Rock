# ZapGenda - Execution Plan (Dev Lead)

Last updated: 2026-02-08

## Phase 0 - Baseline & Safety
- Create a working branch/folder copy if needed
- Read current specs: ZAPGENDA_SYSTEM_SPEC.md, ZAPGENDA_UI_REQUIREMENTS.md
- Confirm scope for MVP

## Phase 1 - Critical Fixes (Core Functionality)
### 1. Messaging types & cron alignment
- Unify message_type values between UI and cron
- Add separate confirmation/reminder logic
- Fix status mismatch (completed vs attended)
- Add timezone support for scheduled sends
- Skip sends if appointment created < 24h before start

### 2. Tokens & templates
- Canonical tokens: {{token}} EN only
- Localized labels in UI
- Protected token insertion (no typing/paste)
- Replace legacy placeholders

### 3. Intent parser (explicit actions)
- Confirm / cancel / reschedule detection by intent
- Mixed intent => cancel intent wins
- Ask explicit confirmation before cancelling
- Ambiguous => ask again

## Phase 2 - Database Migrations
- Add company_settings: language, timezone, confirmation_hours, reminder_hours
- Add appointments: reminder_sent_at (and migrate old markers)
- Add audit_logs table
- Add affiliate tables
- Update enums/status constraints if needed

## Phase 3 - UI Updates
- Auto messages editor with protected tokens + preview
- Affiliate dashboards (superuser + affiliate)
- Company settings additions (language/timezone)
- Audit log viewer (superuser + company admin)

## Phase 4 - Staging Integrations
- Supabase project + env vars
- Vercel project + env vars
- Z-API credentials + webhook validation
- Stripe Connect Express setup

## Phase 5 - Verification
- Unit tests for parser
- Cron dry-run tests
- End-to-end smoke test (create appointment -> confirm -> reminder)

## Phase 6 - Post-MVP Enhancements
- Onboarding checklist
- Contact import wizard
- MFA/2FA enforcement for all users (including SuperUser)
- Send onboarding email with MFA instructions + backup codes usage (pending)

---

## Change Log
- 2026-02-03: Initial plan created
- 2026-02-03: Phase 1 started (message types + cron rewrite + token editor restrictions + intent gating + timezone hooks)
- 2026-02-03: Migration added for messaging fields, audit logs, and affiliates
- 2026-02-03: Updated Supabase types for new columns and affiliate tables
- 2026-02-03: Added audit log hooks for appointment and auto-message actions
- 2026-02-03: Affiliate dashboards wired to Supabase queries
- 2026-02-05: Added affiliate filter + display + manual assignment in superuser Companies list
- 2026-02-05: Added affiliate commissions dashboard (totals, per-client, monthly history)
- 2026-02-05: Added Stripe Connect Express onboarding + status refresh for affiliates
- 2026-02-05: Added superuser affiliate commissions report (totals + per-affiliate table)
- 2026-02-05: Added audit logs viewer (superuser + company) with filters and RLS policy
- 2026-02-05: Added affiliate commission generator (cron) + unique constraint
- 2026-02-05: Stripe webhook now generates commissions and updates affiliate Stripe status
- 2026-02-05: Superuser detailed commissions table + CSV export + post-cancel commission window
- 2026-02-05: Affiliate payouts flow (monthly generator + approval + Stripe transfer)
- 2026-02-05: Commission clawback on refunds/chargebacks
- 2026-02-05: Audit logs for scheduling rules changes and manual status updates
- 2026-02-05: Token labels localized + full IANA timezone list in company settings
- 2026-02-06: Added Z-API QR code + phone code edge functions and WhatsApp connection UI tabs
- 2026-02-06: Documented Z-API manual instance flow and connection modes in system/UI specs
- 2026-02-06: Auto-mark no-show now uses end_time + company timezone
- 2026-02-06: Scheduled messages now go through zapi-send-message and appear in live chat
- 2026-02-06: Live chat shows "auto" indicator for automated outbound messages
- 2026-02-06: Billing grace period enforcement (7 days) with warning banner and payment redirect
- 2026-02-06: Added cron to suspend overdue companies after grace window
- 2026-02-06: Post-attended and post-missed follow-ups now respect company timezone
- 2026-02-06: Company phone token now populates from settings or owner WhatsApp
- 2026-02-08: Added Supabase documentation (ZAPGENDA_SUPABASE_DOC.md)


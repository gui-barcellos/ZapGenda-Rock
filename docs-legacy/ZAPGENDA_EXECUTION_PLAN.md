# ZapGenda - Execution Plan (Dev Lead)

Last updated: 2026-03-24

## Audit snapshot (2026-03-24)

Current verified state:
- `npm run build` passes.
- Dev server is now persistent locally on port 8080 via user systemd service.
- Frontend routes for reset/invite are present: `/auth/reset` and `/accept-invite`.
- Appointment create/update flows share the same scheduling validation path in `useAppointments`.
- Local MVP flow appears coherent for dev use, but the repo is still not credential-validated end-to-end.
- `npm run lint` still fails broadly (last audit: 345 findings, 321 errors / 24 warnings), so repo-wide lint cannot be treated as a release gate pass.

Conclusion:
The main bottleneck is no longer local UX coherence. The bottleneck is credentialed integration + smoke validation in real infrastructure.

## 4-Stage Finish Plan (current execution order)

### Stage 1 - Close the local MVP loop
Objective: leave the product coherent and usable end-to-end in local/dev without depending on external credentials.

Scope:
- Finish the core operational path: company onboarding -> professionals -> services -> availability -> WhatsApp setup guidance -> first appointment flow
- Remove UX dead-ends and contradictory states in dashboard, schedule, contacts and settings pages
- Stabilize auth-related frontend flows already touched recently (reset/invite/access)
- Review scheduling logic and local guards for invalid states/conflicts
- Keep local frontend boot resilient when Supabase env is missing

Definition of done:
- Main company-user path is navigable and understandable
- No obvious empty-state traps or broken CTA chains
- Build passes
- Execution plan updated with remaining blockers

Status: COMPLETE (local/dev scope)
Progress notes:
- Guided onboarding/empty-state flow already in place across dashboard, schedule, professionals, services, availability and WhatsApp setup.
- Confirmed reset/invite/access routes are wired in frontend for `/auth/reset` and `/accept-invite`.
- Hardened appointment editing/reallocation so the same scheduling guards used on creation now also apply on updates, preventing invalid moves/conflicts from bypassing the MVP rules.
- Local dev availability improved: Zapgenda now auto-starts on port 8080 for development via user systemd service.
- Production/live validation still depends on real Supabase/Auth/Z-API credentials.

### Stage 2 - Credentialed hookup and smoke validation
Objective: turn the coherent local MVP into a real integrated MVP with the smallest possible validation surface.

Scope:
- Configure real frontend env (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`)
- Configure Supabase/Resend/Z-API secrets in the target project
- Deploy the critical edge functions
- Validate auth flows end-to-end (create company, reset, invite, login)
- Validate WhatsApp connection + webhook + scheduled outbound mirroring in chat
- Execute the smoke checklist from `ZAPGENDA_HANDOFF_CHECKLIST.md`

Definition of done:
- A real company can be created, onboarded and logged in
- A real invite/reset flow works from email link to login
- WhatsApp connects and live/chat automation behaves as expected
- Appointment create/confirm/reminder/cancel path is validated in live infra

Status: NOT STARTED / BLOCKED BY CREDENTIALS
Progress notes:
- All remaining MVP uncertainty is concentrated here.
- This is the highest-leverage next stage.

### Stage 3 - Harden code paths and delivery quality
Objective: reduce breakage risk and make the codebase safe enough to ship an MVP.

Scope:
- Fix or isolate the most harmful lint/type hotspots in files touched by MVP flow
- Add/expand tests for scheduling and appointment validation utilities where feasible
- Normalize message/scheduling behavior that can be finished locally without live credentials
- Improve docs/checklists so external integration work is short and deterministic later
- Record known credential-dependent blockers explicitly instead of leaving them implicit

Definition of done:
- Build passes and local quality is improved in the critical path
- Core scheduling/domain utilities have coverage or documented validation steps
- Remaining lint debt is categorized as legacy/non-blocking vs blocking

Status: PARTIAL
Progress notes:
- Refactored `src/hooks/useAppointments.tsx` to centralize scheduling validation for create + update flows instead of leaving reschedules with weaker guards.
- Build still passes.
- Full repo lint still fails broadly (last audit: 345 findings), so repo-wide hygiene is not complete.
- Automated unit tests were not added because the repo currently has no established test runner/script; instead, the scheduling validation path was consolidated and a credentialed smoke checklist was documented for final hookup.

### Stage 4 - Prepare and maintain the external handoff surface
Objective: keep the repo ready for final credentialed hookup with minimum ambiguity.

Scope:
- Finalize docs for Supabase/Vercel/Z-API hookup
- Verify env expectations, callback routes, webhook assumptions and operator checklist
- Keep the smoke-test checklist aligned with current code reality
- Mark exactly what still requires credentials/live infra and what is already ready

Definition of done:
- Repo docs are handoff-ready and trustworthy
- Final checklist exists for production/staging hookup
- Remaining work is reduced to external integration and live validation

Status: PARTIAL / NEEDS CONTINUOUS SYNC
Progress notes:
- `ZAPGENDA_HANDOFF_CHECKLIST.md` exists and remains useful.
- The plan/checklist had drifted from current code state; this audit updates the main docs, but they must now be treated as living operational docs.

## Legacy phase breakdown (historical detail)

## Phase 0 - Baseline & Safety
- Create a working branch/folder copy if needed
- Read current specs: ZAPGENDA_SYSTEM_SPEC.md, ZAPGENDA_UI_REQUIREMENTS.md
- Confirm scope for MVP

## Phase 1 - Critical Fixes (Core Functionality)
### 0. Access / onboarding hardening
- Fix admin password setup links to open the correct frontend route
- Support both Supabase recovery return styles (`#access_token` and `?code=`)
- Add invite acceptance flow (`/accept-invite`) for invited company users
- Ensure local app does not fail with blank screen when Supabase env is missing

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
- In-app onboarding checklist / setup guidance for company users

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
- 2026-03-12: Fixed admin password setup/reset routing to `/auth/reset` in create-company and resend-password flows
- 2026-03-12: ResetPassword now supports both hash-token recovery and `?code=` recovery exchange
- 2026-03-12: Added `/accept-invite` frontend flow and `accept-user-invite` edge function for invited users
- 2026-03-12: Hardened local frontend boot so missing Supabase env shows a clear warning instead of a blank screen
- 2026-03-12: Added in-app onboarding checklist for company users and blocked misleading schedule creation before minimum setup is complete
- 2026-03-12: Improved first-appointment journey with guided empty states on dashboard and schedule, plus onboarding CTAs across professionals/services/availability/WhatsApp settings
- 2026-03-13: Consolidated the finish strategy into 3 macro stages focused on local MVP closure, hardening, and credentialed handoff readiness
- 2026-03-13: Unified appointment create/update scheduling guards in `src/hooks/useAppointments.tsx` so reschedules and drag/drop moves no longer bypass availability/conflict validation
- 2026-03-13: Reduced critical-path type debt in touched MVP files and verified targeted ESLint on `useAppointments` + `Dashboard`
- 2026-03-13: Added `ZAPGENDA_HANDOFF_CHECKLIST.md` covering envs, callbacks, deploy order, scheduler expectations, smoke tests, and remaining credential-dependent blockers
- 2026-03-24: Audited current repo state; confirmed build still passes, lint still fails broadly, local dev now auto-starts on port 8080, and reprioritized execution order around credentialed hookup + smoke validation

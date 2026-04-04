# ZapGenda - External Handoff Checklist

Last updated: 2026-03-24

Purpose: leave the final credentialed hookup short, explicit, and repeatable.

Audit note (2026-03-24): build still passes locally; the remaining uncertainty is real credentials/infrastructure validation, not the existence of the documented frontend routes.

---

## 1) Frontend env expected by Vite

Create `.env.local` with:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=jiuzziiwigrjpavqopli
```

Behavior without env:
- Frontend now boots with a friendly configuration warning instead of a blank screen.
- Credentialed validation still requires the real Supabase URL + anon key.

---

## 2) Supabase secrets required for Edge Functions

Set in Supabase Dashboard → Edge Functions → Secrets:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=
APP_URL=
```

Additional provider secrets still required for live behavior:

```env
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
ZAPI_CLIENT_TOKEN=
OPENAI_API_KEY    # or the provider currently adopted in the project
RESEND_API_KEY
```

Notes:
- Some integrations are stored in DB tables after setup (Stripe, Z-API, AI settings), but the platform secrets still need to exist first.
- `APP_URL` must point to the deployed frontend so auth/reset/invite emails generate usable links.

---

## 3) Routes and callback surfaces to validate

### Public frontend auth routes
- `/login`
- `/auth/reset`
- `/accept-invite`
- `/setup-superuser`

### Company routes used in MVP handoff
- `/company/dashboard`
- `/company/schedule`
- `/company/settings/professionals`
- `/company/settings/services`
- `/company/settings/availability`
- `/company/settings/auto-messages`
- `/company/settings/whatsapp`

### Edge functions that must be deployed for the current MVP path
- `accept-user-invite`
- `create-company`
- `send-admin-password-reset`
- `send-user-invite`
- `send-scheduled-messages`
- `auto-mark-no-show`
- `zapi-qr-code`
- `zapi-phone-code`
- `zapi-validate-connection`
- `zapi-send-message`
- `zapi-webhook`

---

## 4) Minimum deploy order

1. Apply DB migrations
   ```bash
   supabase db push
   ```
2. Deploy critical functions
   ```bash
   supabase functions deploy accept-user-invite
   supabase functions deploy create-company
   supabase functions deploy send-admin-password-reset
   supabase functions deploy send-user-invite
   supabase functions deploy send-scheduled-messages
   supabase functions deploy auto-mark-no-show
   supabase functions deploy zapi-qr-code
   supabase functions deploy zapi-phone-code
   supabase functions deploy zapi-validate-connection
   supabase functions deploy zapi-send-message
   supabase functions deploy zapi-webhook
   ```
3. Confirm auth email templates/redirects use the deployed `APP_URL`
4. Configure company-level Z-API credentials in the app
5. Enable scheduler jobs in Supabase Dashboard / runtime ops

---

## 5) Scheduler / cron expectations

Documented jobs expected in production:
- `reset-monthly-tokens` monthly
- `verify-whatsapp-connections` every 5 min
- `auto-mark-no-show` every 30 min
- `send-scheduled-messages` hourly
- `expire-pending-conversations` every 1 min
- `generate-affiliate-commissions` daily
- `generate-affiliate-payouts` monthly
- `suspend-overdue-companies` daily

Important:
- `supabase/config.toml` currently documents function auth config but does **not** carry the scheduler blocks anymore.
- Re-apply schedules in the target environment deliberately instead of assuming they already exist.

---

## 6) Smoke test checklist for final credentialed hookup

### A. Auth / onboarding
- [ ] Create a company from superuser flow
- [ ] Confirm company record and owner profile were created
- [ ] Trigger admin password setup/reset email
- [ ] Open link and verify it lands on `/auth/reset`
- [ ] Complete password definition successfully
- [ ] Send a user invite
- [ ] Open invite link and verify it lands on `/accept-invite`
- [ ] Accept invite and verify login works for invited user

### B. Local MVP operational path
- [ ] In company settings, create at least one active professional
- [ ] Create at least one active service
- [ ] Link service to professional
- [ ] Configure business hours / availability
- [ ] Open `/company/schedule` and verify onboarding blockers disappear
- [ ] Create the first manual appointment
- [ ] Attempt an invalid/conflicting move and confirm the UI blocks it
- [ ] Edit/reallocate the appointment and confirm the same rules still apply

### C. WhatsApp connection
- [ ] Open `/company/settings/whatsapp`
- [ ] Validate QR code fetch
- [ ] Validate phone-code flow
- [ ] Confirm status refresh detects connected number

### D. Automated messaging
- [ ] Create an appointment far enough in advance for confirmation/reminder logic
- [ ] Verify `appointment_confirmation` template exists and is active
- [ ] Verify `appointment_reminder` template exists and is active
- [ ] Trigger/simulate `send-scheduled-messages`
- [ ] Confirm confirmation message is sent and mirrored in live chat
- [ ] Confirm reminder message is sent and mirrored in live chat
- [ ] Confirm `confirmation_sent_at` / `reminder_sent_at` update correctly

### E. Status progression
- [ ] Confirm explicit patient confirmation moves status to `confirmed`
- [ ] Confirm explicit cancel intent does **not** auto-cancel without confirmation
- [ ] Mark appointment as `completed` manually in UI and verify downstream expectations
- [ ] Validate no-show automation for a finished appointment window when enabled

---

## 7) Ready locally vs still credential-dependent

### Ready locally now
- Frontend route wiring for reset and invite acceptance
- Friendly boot behavior when Supabase env is missing
- Guided onboarding/empty-state flow for company setup
- Manual appointment creation/edit flow with shared scheduling validation
- Build passes

### Still blocked on external credentials / live infra
- Real auth emails (Resend)
- Real Supabase project validation end-to-end
- Real Z-API connection and webhook validation
- Real scheduled sends through WhatsApp
- Real Stripe flows / webhook confirmation
- Production scheduler enablement

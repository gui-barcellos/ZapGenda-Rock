# ZapGenda Launch Plan

Last updated: 2026-03-30
Status: Living execution plan from current state to MVP launch

## 1. Launch goal
Launch a controlled MVP for a real clinic with the minimum reliable feature set required to operate appointments through WhatsApp.

## 2. Launch philosophy
This plan prioritizes:
- real operational readiness over document completeness
- critical-path validation over broad cleanup
- proof in live environment over local assumptions
- controlled launch over premature scale

## 3. Current position
The local/dev product loop is largely coherent.
The main bottleneck is credentialed integration and smoke validation in real infrastructure.

## 4. MVP cut for launch
### In scope for launch
- real auth/access flow
- company onboarding and minimum setup
- professionals, services, and availability setup
- manual appointment create/edit/reallocate path
- WhatsApp connection through Z-API
- confirmation and reminder automation
- live chat mirror of automated outbound messages
- explicit appointment state progression rules
- no-show automation when enabled
- minimum superuser capability to create and support clinics

### Out of scope unless they help launch directly
- affiliate payout/commercial flows
- broader Stripe work beyond what is strictly required for the pilot
- advanced reports and analytics
- contact import
- Google Calendar sync
- full MFA rollout
- extra polish outside the critical path

### Launch success means
A real clinic can be created, onboarded, connected to WhatsApp, operate appointments, and validate the critical automation flow in a controlled pilot.

## 5. Stage-by-stage launch path

### Stage 1 — Freeze the MVP cut
Objective:
Lock the launch scope and remove ambiguity.

Final scope decisions:
- Launch will focus on one real clinic in a controlled pilot
- Z-API remains the WhatsApp provider for the MVP
- Affiliate features and affiliate payout flows do not block launch
- Billing and Stripe subscription/cobrança flow remain in the launch-critical path
- The minimum superuser flow for launch is: create company, trigger/reset access, support onboarding, and verify basic operational state
- Reports, analytics, advanced admin surfaces, and non-critical polish are explicitly outside the launch-critical path

Actions:
- [x] Confirm the in-scope launch items listed in this file
- [x] Confirm the out-of-scope list
- [x] Decide explicitly that affiliate/commercial extras will not block launch
- [x] Define the minimum superuser flow needed for the pilot
- [x] Record any remaining scope decisions directly in this file

Owner:
- Rock + Guilherme

Depends on:
- none

Done when:
- no critical-path scope ambiguity remains
- this document reflects the final MVP cut

Evidence:
- in-scope / out-of-scope lists approved
- superuser minimum launch flow defined
- Z-API confirmed as current MVP provider

Status:
- COMPLETE

---

### Stage 2 — Prepare real environment and credentials
Objective:
Make the target environment ready to receive the MVP.

Actions:
- [x] Identify the Supabase project reference already documented in repo (`jiuzziiwigrjpavqopli`)
- [ ] Confirm whether `jiuzziiwigrjpavqopli` is still the real target project for launch
- [ ] Identify the target Vercel project / deployment URL
- [ ] Create or populate frontend env values:
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_PUBLISHABLE_KEY`
  - [x] `VITE_SUPABASE_PROJECT_ID` is already documented
- [x] Map required Edge Function secrets from code/docs:
  - [x] `SUPABASE_URL`
  - [x] `SUPABASE_SERVICE_ROLE_KEY`
  - [x] `SUPABASE_ANON_KEY`
  - [x] `APP_URL`
- [x] Map provider inputs required for the current launch path:
  - [x] `RESEND_API_KEY`
  - [x] `ZAPI_CLIENT_TOKEN`
  - [x] current AI provider key, if needed for MVP path
  - [x] Stripe key/config remains required for billing path
- [ ] Configure the real secrets in the target environment
- [ ] Confirm callback base URL is the real deployed frontend URL
- [x] Record where each secret/config lives
- [x] Verify which integrations are env-based vs DB-stored

Owner:
- Rock

Depends on:
- Stage 1

Done when:
- target environment exists
- all required secrets/env vars are configured
- callback URL is known and correct

Evidence:
- configuration checklist completed
- target URLs documented
- secret/config storage model mapped from codebase

Status:
- IN PROGRESS / PARTIALLY MAPPED / BLOCKED BY EXTERNAL ACCESS

SUPER reset note:
- The repo already supports bootstrap of the first superuser through `/setup-superuser` + `bootstrap_superuser()`.
- To reset SUPER safely, we need Supabase project access to remove the current superuser role/auth user state or confirm the target project is clean.
- Local code was hardened so the setup page no longer ships with a prefilled superuser email/password.

---

### Stage 3 — Deploy the critical backend surface
Objective:
Deploy only the backend pieces needed to validate the launch path.

Actions:
- [ ] Apply DB migrations to target Supabase project
- [ ] Deploy critical Edge Functions:
  - [ ] `accept-user-invite`
  - [ ] `create-company`
  - [ ] `send-admin-password-reset`
  - [ ] `send-user-invite`
  - [ ] `send-scheduled-messages`
  - [ ] `auto-mark-no-show`
  - [ ] `zapi-qr-code`
  - [ ] `zapi-phone-code`
  - [ ] `zapi-validate-connection`
  - [ ] `zapi-send-message`
  - [ ] `zapi-webhook`
- [ ] Confirm auth email redirect URLs point to the deployed frontend
- [ ] Recreate the required scheduler jobs in the target environment
- [ ] Verify deployed functions are using the right secrets

Owner:
- Rock

Depends on:
- Stage 2

Done when:
- schema is applied
- critical functions are deployed
- scheduler is explicitly configured
- auth redirects are correct

Evidence:
- deploy checklist completed
- migration/deploy/scheduler record saved

Status:
- NOT STARTED / BLOCKED BY CREDENTIALS

---

### Stage 4 — Validate auth and access flows end-to-end
Objective:
Prove that real users can enter the system.

Actions:
- [ ] Create a company using the real flow
- [ ] Verify company record exists in the database
- [ ] Verify owner profile exists
- [ ] Trigger admin password setup/reset email
- [ ] Confirm email link lands on `/auth/reset`
- [ ] Complete password definition successfully
- [ ] Log in as company admin
- [ ] Send a user invite
- [ ] Confirm invite link lands on `/accept-invite`
- [ ] Accept the invite successfully
- [ ] Log in as invited user

Owner:
- Rock

Depends on:
- Stages 2 and 3

Done when:
- company creation works in real infra
- reset works in real infra
- invite works in real infra
- admin and invited user both log in successfully

Evidence:
- completed auth flow record

Status:
- NOT STARTED

---

### Stage 5 — Validate company setup path
Objective:
Prove that a clinic can complete minimum setup and unlock the operational path.

Actions:
- [ ] Create one active professional
- [ ] Create one active service
- [ ] Link service to professional
- [ ] Configure business hours / availability
- [ ] Confirm onboarding blockers disappear after minimum setup
- [ ] Open company schedule and confirm it becomes operable
- [ ] Create the first manual appointment
- [ ] Attempt an invalid or conflicting move and confirm it is blocked
- [ ] Edit/reallocate the appointment and confirm the same rules still apply

Owner:
- Rock

Depends on:
- Stage 4

Done when:
- a real clinic can complete minimum setup
- the schedule becomes operational
- validation rules still hold in the real environment

Evidence:
- completed setup flow record

Status:
- NOT STARTED

---

### Stage 6 — Validate WhatsApp connection and live messaging
Objective:
Prove that the clinic can connect WhatsApp and that the integration is operational.

Actions:
- [ ] Open WhatsApp settings in the real environment
- [ ] Validate QR code fetch
- [ ] Validate phone-code flow
- [ ] Confirm status refresh detects connected number
- [ ] Validate Z-API webhook reception
- [ ] Validate outbound send path through Z-API
- [ ] Confirm at least one real message path behaves correctly

Owner:
- Rock

Depends on:
- Stages 3, 4, and 5

Done when:
- WhatsApp connects successfully
- connection status is reliable enough for operation
- webhook and outbound path both work

Evidence:
- live pairing + send/receive validation record

Status:
- NOT STARTED

---

### Stage 7 — Validate appointment automation and state progression
Objective:
Prove that the core automation path works end-to-end in real conditions.

Actions:
- [ ] Create an appointment far enough in advance for automation rules
- [ ] Verify confirmation template exists and is active
- [ ] Verify reminder template exists and is active
- [ ] Trigger or simulate scheduled message processing
- [ ] Confirm confirmation message is sent
- [ ] Confirm reminder message is sent
- [ ] Confirm both messages appear correctly in live chat
- [ ] Confirm sent markers update correctly
- [ ] Validate explicit patient confirmation moves status correctly
- [ ] Validate explicit cancel intent does not auto-cancel unsafely
- [ ] Validate manual completion behavior
- [ ] Validate no-show automation when enabled

Owner:
- Rock

Depends on:
- Stages 5 and 6

Done when:
- confirmation/reminder automation works in real infra
- chat mirror matches automated outbound behavior
- state progression follows product rules

Evidence:
- automation validation checklist completed

Status:
- NOT STARTED

---

### Stage 8 — Run full smoke test
Objective:
Run the MVP path end-to-end and expose only the real blockers.

Actions:
- [ ] Execute the full path from company creation to automated messaging
- [ ] Record pass/fail for each step
- [ ] Separate launch blockers from non-blocking issues
- [ ] Re-test anything fixed during the smoke cycle

Owner:
- Rock

Depends on:
- Stages 4 through 7

Done when:
- the critical path has one successful end-to-end pass
- remaining issues are classified clearly

Evidence:
- smoke test record with blocker classification

Status:
- NOT STARTED

---

### Stage 9 — Fix only what blocks launch
Objective:
Reduce risk without getting lost in cleanup.

Actions:
- [ ] Fix only the failures that block real MVP operation
- [ ] Classify lint/type issues by launch impact
- [ ] Isolate or defer non-critical debt
- [ ] Document manual fallback steps where needed
- [ ] Sync docs with what is now truly validated

Owner:
- Rock

Depends on:
- Stage 8

Done when:
- critical blockers are resolved or consciously accepted with fallback
- non-critical debt is explicitly separated

Evidence:
- blocker list resolved or accepted
- docs updated

Status:
- PARTIAL FOUNDATION EXISTS

---

### Stage 10 — Controlled pilot launch
Objective:
Put the MVP in front of one real clinic under close observation.

Actions:
- [ ] Choose the pilot clinic
- [ ] Onboard the clinic with support
- [ ] Monitor the first real usage closely
- [ ] Capture friction points and failures quickly
- [ ] Patch only what is necessary to keep the pilot operational
- [ ] Record the immediate post-launch findings

Owner:
- Rock + Guilherme

Depends on:
- Stages 1 through 9

Done when:
- one real clinic is using the MVP in a controlled pilot
- the product survives initial real usage

Evidence:
- pilot launched
- first operational notes recorded

Status:
- NOT STARTED

## 6. Launch blockers summary
Current blockers most likely to stop launch:
- missing real credentials/configuration
- undeployed target Edge Function surface
- unvalidated auth email flows
- unvalidated Z-API connection/webhook path
- no completed end-to-end smoke test evidence

## 7. Non-blockers unless they hit the critical path
These should not delay the controlled MVP launch by default:
- repo-wide lint cleanup
- broad UI polish outside the core path
- non-essential reports and dashboards
- post-MVP integrations
- broad refactors not tied to launch risk

## 8. Working rule for execution
At each stage, distinguish:
- implemented
- validated locally
- validated in real infra

Only the third category counts as real launch confidence.

## 9. Main references
- `ZAPGENDA_PRODUCT_BLUEPRINT.md`
- `ZAPGENDA_IMPLEMENTED_STATE.md`
- `ZAPGENDA_SUPABASE_DOC.md`
- `docs-legacy/ZAPGENDA_HANDOFF_CHECKLIST.md`
- `docs-legacy/ZAPGENDA_EXECUTION_PLAN.md`
- `docs-legacy/ZAPGENDA_MVP_CHECKLIST.md`

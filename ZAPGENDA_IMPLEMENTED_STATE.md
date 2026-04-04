# ZapGenda Implemented State

Last updated: 2026-03-30
Status: Living document of what is already implemented or verified

## 1. Current summary
ZapGenda already has a coherent local/dev product core. The biggest remaining uncertainty is not the local UX skeleton anymore; it is real infrastructure hookup and credentialed end-to-end validation.

Current high-level position:
- local/dev product coherence: strong
- real integration validation: still pending
- launch readiness: partial

## 2. Verified current state
### 2.1 Build and local runtime
Implemented / verified:
- `npm run build` passes
- local dev server is persistent on port 8080 via user systemd service
- frontend remains usable locally even when Supabase env is missing, showing a friendly warning instead of a blank screen

### 2.2 Auth-related frontend paths
Implemented / verified:
- frontend route exists for `/auth/reset`
- frontend route exists for `/accept-invite`
- reset/password setup flow was hardened to support the documented recovery return styles
- invite acceptance frontend flow exists for invited company users

### 2.3 Company onboarding and local product flow
Implemented / verified locally:
- guided onboarding and empty-state improvements across the company path
- schedule/dashboard/settings now avoid more obvious dead ends before minimum setup
- onboarding cues exist across dashboard, schedule, professionals, services, availability, and WhatsApp setup
- local MVP path is coherent enough for development use

### 2.4 Scheduling and appointment validation
Implemented / verified locally:
- appointment creation, editing, and reallocation now share the same scheduling validation path
- validation covers availability, conflicts, service-professional linkage, scheduling rules, and blocked slots in the local path
- reschedules and drag/drop-like update paths were hardened so they do not bypass the same core guards used on creation

### 2.5 Messaging and automation-related implementation already reported
Implemented in codebase history / documented as delivered:
- appointment-related scheduling/message alignment work was started and partially consolidated
- no-show automation now uses appointment end time plus company timezone
- scheduled messages go through the WhatsApp sending path and are expected to appear in live chat
- live chat supports automated outbound indicator behavior
- company phone token can populate from settings or owner WhatsApp
- company settings include timezone-related support and token localization work

### 2.6 Auditability and operational support
Implemented / reported:
- audit logs were added for important scheduling-related actions and template/rule changes in the documented workstream
- handoff/infrastructure documentation exists
- Supabase setup reference exists in `ZAPGENDA_SUPABASE_DOC.md`

### 2.7 Additional product surfaces reported as implemented in prior work
Reported in historical delivery notes:
- affiliate dashboards and commissions-related flows were built in some level
- Stripe Connect affiliate onboarding and status refresh were added
- commissions and payouts workstreams were implemented in the codebase history
- billing grace-period enforcement and overdue suspension automation were added

These areas exist in the documented history, but are not all necessarily part of the critical launch path.

## 3. Validation level by area
### 3.1 Implemented and locally validated
- frontend auth routes for reset/invite
- local frontend resilience without Supabase env
- onboarding/empty-state guidance in the main company flow
- build success
- shared scheduling validation path for create/update/reallocate flows

### 3.2 Implemented but still needing real credentialed validation
- create-company real flow
- auth email delivery and redirect behavior with real providers
- invite acceptance with real email token path
- WhatsApp connection via real Z-API
- Z-API webhook behavior
- scheduled outbound messages in live infra
- live chat mirroring in real conversations
- confirmation/reminder automation in real environment
- no-show automation in real environment
- Vercel deployment configuration
- production scheduler enablement

### 3.3 Partial / needs continuous sync
- repo-wide code hygiene
- classification of lint debt by criticality
- docs alignment between implemented reality and current launch path
- confidence level of edge functions in the target environment

## 4. Known gaps in current validation
Not yet verified end-to-end with real credentials:
- real Supabase target project hookup
- real frontend env hookup (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`)
- edge functions deployed to target project
- secrets configured correctly in target project
- Resend email flow for reset/invite
- Z-API live connection and webhook
- Vercel env and deploy validation
- complete smoke test from company creation to automated messaging

## 5. Current blockers
### Primary blocker
No credentialed end-to-end validation has been completed yet.

### Secondary blockers
- repo-wide lint still fails broadly and cannot be treated as a release gate pass
- launch-critical flows need real-environment evidence rather than local confidence only
- some docs had drifted and are now being reorganized into the new structure

## 6. Areas considered effectively done for local/dev scope
These areas can be treated as substantially done for local/dev scope:
- guided local company onboarding path
- local auth route wiring for reset and invite
- safe local scheduling validation path for create/update/reallocate
- local app resilience when env is missing
- build passing
- existence of handoff/deployment reference material

## 7. Areas considered not done for launch scope
These areas should not be treated as complete until they are validated in real infrastructure:
- real auth flow from email to login
- real company creation in target Supabase project
- real WhatsApp pairing and connection status validation
- real webhook processing
- real confirmation/reminder delivery and chat mirror validation
- final smoke test evidence

## 8. Evidence references
Main references for current implemented-state claims:
- `docs-legacy/ZAPGENDA_EXECUTION_PLAN.md`
- `docs-legacy/ZAPGENDA_MVP_CHECKLIST.md`
- `docs-legacy/ZAPGENDA_HANDOFF_CHECKLIST.md`
- `ZAPGENDA_SUPABASE_DOC.md`

## 9. Practical status read
If someone asks “what do we already have?”, the short answer is:
- the local product core is mostly there
- the appointment validation path was meaningfully hardened
- auth route wiring and onboarding flow were improved
- build passes
- launch is currently blocked less by missing product ideas and more by missing real-environment validation

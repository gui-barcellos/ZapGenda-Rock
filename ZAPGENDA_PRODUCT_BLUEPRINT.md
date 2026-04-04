# ZapGenda Product Blueprint

Last updated: 2026-03-30
Status: Source of truth for product scope

## 1. Product summary
ZapGenda is a multi-tenant SaaS for clinics in health and aesthetics that automates appointment scheduling and customer communication through WhatsApp.

The product goal is not to feel like a bot. It should behave like a human assistant operating through WhatsApp, while respecting strict operational rules and explicit user intent.

## 2. Product objective
The MVP must allow a clinic to:
- enter the system
- configure its operation
- connect WhatsApp
- manage professionals, services, schedules, and appointments
- communicate with patients through mirrored WhatsApp conversations
- automate the critical appointment communication flow

The MVP does not need to solve every future integration. It needs to support one real clinic operationally, with predictable behavior and controlled manual fallback where necessary.

## 3. Target users
### Primary customer
- Clinics in health and aesthetics

### Internal roles
- Superuser / operator
- Company admin / clinic staff
- Company users invited by the clinic
- Affiliate users (if included in the MVP cut)

### External actor
- Patient communicating through WhatsApp

## 4. Core product principles
- AI-first, but never reckless
- Human-like conversation, not chatbot-style interaction
- Plain text only on WhatsApp; no buttons
- Only explicit intent changes critical appointment state
- Silence never means cancellation
- Company-level customization for messaging and scheduling rules
- Company timezone is the operational reference
- The system must keep the WhatsApp mirror coherent with real outbound activity

## 5. MVP scope
The MVP scope is the minimum product that can be used by a real clinic in a controlled launch.

### 5.1 What the MVP must include
#### Access and account flows
- Login flow
- Admin password setup/reset flow
- User invite acceptance flow
- Stable frontend routes for auth and access recovery

#### Company operational setup
- Company dashboard
- Guided onboarding / setup cues
- Company settings
- Professionals management
- Services management
- Availability configuration
- Scheduling rules configuration
- WhatsApp connection screen
- Auto messages configuration
- Company users management

#### Appointment operation
- Manual appointment creation
- Appointment editing and reallocation
- Conflict prevention and schedule validation
- Status handling for scheduled, confirmed, completed, cancelled, and no_show
- Manual status changes through UI where applicable

#### WhatsApp operation
- WhatsApp connection via Z-API
- QR-code connection flow
- Phone-code connection flow
- Live chat mirror of outbound automated messages
- Outbound text-only messaging

#### Automated appointment flow
- Appointment confirmation message
- Appointment reminder message
- Explicit confirmation/cancellation/reschedule interpretation
- No-show automation when enabled by company
- Timezone-aware scheduling behavior

#### Core auditability
- Critical appointment actions logged
- Key rule/template changes auditable where already supported

### 5.2 What may be in the MVP only if it does not delay launch
- Superuser operational dashboards beyond the minimum needed to manage clinics
- Affiliate visibility and payout operations
- Additional reports and analytics
- Extra onboarding polish

### 5.3 Post-MVP
- Automated Z-API instance creation
- Google Calendar sync
- Expanded multi-language rollout
- Contact import wizard
- Broader AI governance controls
- Full MFA rollout everywhere
- Non-essential UX refinements

## 6. Required modules
### 6.1 Authentication and access
Required surfaces:
- `/login`
- `/auth/reset`
- `/accept-invite`
- `/setup-superuser`

Required behavior:
- Password setup/reset links must land in the correct route
- Recovery must support both token return styles already documented
- Invited company users must be able to accept invitation and access the app
- Missing frontend env must not crash the app into a blank screen

### 6.2 Superuser surface
At minimum, the product needs enough superuser capability to:
- create companies
- manage essential operational setup
- trigger or support onboarding flows
- verify company status when operating the MVP

Potential surfaces:
- Dashboard
- Companies
- Setup Superuser
- Per-company operational settings if needed

Additional admin/affiliate/billing surfaces may exist, but are not all launch-critical.

### 6.3 Company surface
Core pages:
- Dashboard
- Schedule
- Live Chat
- Contacts / WhatsApp
- Contacts / Patients
- CRM
- Reports

Core settings pages:
- Company Data
- Professionals
- Services
- Availability
- Scheduling Rules
- Users
- Auto Messages
- WhatsApp Connection

Other settings pages can exist, but the MVP launch should prioritize what is required for real operation.

### 6.4 Scheduling domain
The system must support:
- professionals
- services
- service-professional linkage
- business hours / availability
- scheduling constraints inherited from the existing business rules
- safe create/edit/reallocate flows
- prevention of invalid or conflicting appointments

Required business rules include:
- min_advance_hours / max_advance_days
- AI/manual variations where applicable
- scheduling_mode
- month opening behavior
- date/week opening strategy
- company-configurable no-show automation

### 6.5 Appointment statuses
Canonical statuses:
- scheduled
- confirmed
- completed
- cancelled
- no_show

Rules:
- Silence does not change status
- Only explicit user intent changes status
- Post-appointment logic must align on `completed`, not mixed legacy naming

### 6.6 Automated messages
Required automated message types for the full product blueprint:
- appointment_confirmation
- appointment_reminder
- post-appointment follow-up
- post-no-show follow-up
- internal reschedule notice
- scheduled return reminder
- birthday message

Critical MVP automation path:
- appointment_confirmation
- appointment_reminder
- explicit reply handling for confirm/cancel/reschedule

Rules:
- max 2 automated messages per appointment in the confirmation/reminder path
- if appointment created less than 24h before start, skip confirmation/reminder
- company chooses its own timings and texts, with defaults
- tokens use canonical `{{token}}` format

Canonical tokens:
- `{{client_name}}`
- `{{company_name}}`
- `{{date}}`
- `{{weekday}}`
- `{{time}}`
- `{{professional_name}}`
- `{{service_name}}`
- `{{company_phone}}`

### 6.7 Conversation logic
The AI or automation layer must:
- act only on explicit user intent
- ask for confirmation when ambiguous
- not auto-cancel from silence
- treat cancel intent with confirmation safeguards
- continue rescheduling flow when user explicitly wants to reschedule
- behave like an operational assistant, not a button-driven bot

### 6.8 WhatsApp integration
Provider for MVP:
- Z-API

Required behavior:
- text-only outbound messages
- QR code and phone-number pairing flows
- webhook support
- connection validation
- automated messages mirrored in live chat
- refresh support for short-lived QR codes

### 6.9 Live chat mirror
The chat view must mirror WhatsApp activity coherently.

Rules:
- every system message sent to the client must appear in live chat
- no extra fake messages
- no missing automated outbound messages
- automated messages may be marked as automatic
- messages only disappear if history is explicitly cleared

### 6.10 Localization and company configuration
MVP language baseline:
- PT-BR

Foundation required:
- localizable labels
- company language field
- company timezone field
- company-level message templates and timing settings

### 6.11 Auditability
The system should log critical actions such as:
- cancellation
- reschedule
- manual status change
- scheduling rules changes
- auto message template changes

## 7. UI surfaces expected in the complete product
### Superuser
- Dashboard
- Affiliates
- Companies
- Subscriptions
- Billing
- Tokens
- AI Settings
- Settings
- Support
- Company Z-API Settings
- Setup Superuser

### Company
- Dashboard
- Schedule
- Live Chat
- AI Usage / AI Settings
- Contacts > WhatsApp
- Contacts > Patients
- CRM
- Reports

### Company settings
- Company Data
- Professionals
- Services
- Availability
- Scheduling Rules
- Users
- Tags
- Auto Messages
- Visual
- FAQ
- Support
- WhatsApp Connection
- Security

These represent the intended product surface. Launch should prioritize only what is needed for a real clinic to operate.

## 8. Data and configuration expectations
### Company settings
Expected fields include:
- confirmation_hours
- reminder_hours
- language
- timezone
- send_confirmation_messages
- send_birthday_messages
- scheduled_return_reminder_days
- auto_mark_no_show_enabled
- auto_mark_no_show_hours

### Appointments
Expected fields include:
- confirmation_sent_at
- reminder_sent_at
- consistent status values

## 9. Definition of MVP success
The MVP is considered successful when a real clinic can:
- be created and onboarded
- access the system successfully
- configure professionals, services, and availability
- connect WhatsApp
- create and manage appointments without obvious scheduling breakage
- send and mirror confirmation/reminder messages through WhatsApp
- process explicit patient confirmation/cancellation/reschedule behavior correctly
- operate with enough reliability for a controlled launch

## 10. Explicit non-goals for launch
These should not delay MVP launch unless they block real operation:
- repo-wide lint perfection
- every dashboard/reporting surface being polished
- full automation of all provider setup
- all affiliate/billing enhancements being production-finished
- all post-MVP integrations and UX refinements

## 11. Supporting references
Primary supporting docs:
- `README.md`
- `ZAPGENDA_IMPLEMENTED_STATE.md`
- `ZAPGENDA_LAUNCH_PLAN.md`
- `ZAPGENDA_SUPABASE_DOC.md`

Legacy reference archive:
- `docs-legacy/ZAPGENDA_SYSTEM_SPEC.md`
- `docs-legacy/ZAPGENDA_UI_REQUIREMENTS.md`
- `docs-legacy/ZAPGENDA_EXECUTION_PLAN.md`
- `docs-legacy/ZAPGENDA_MVP_CHECKLIST.md`
- `docs-legacy/ZAPGENDA_HANDOFF_CHECKLIST.md`

# ZapGenda - UI Requirements (Screens & Modals)

Last updated: 2026-02-03

This document lists the UI surfaces that must exist. It is a checklist for layout planning and future wireframes. Names follow current CliniFlow navigation.

## Global
- Authentication: Login
- Authentication: MFA setup (TOTP + backup codes)
- Authentication: Remember device toggle
- 404 / Not Found
- Toasts/notifications
- Global loading states
- Onboarding checklist (post-MVP): connect WhatsApp, create services, set hours, test booking

## Superuser (Admin System)
### Pages
- Dashboard
- Affiliates (global admin dashboard)
- Companies
- Subscriptions (Active plans, Prices, Templates)
- Billing (Invoices + stats)
- Tokens (usage analytics)
- AI Settings (Master prompt, Function calling, Prompt injections, Logs)
- Settings (API keys: OpenAI/Z.ai, Stripe, Resend, Z-API client token)
- Support (Tickets)
- Company Z-API Settings (per company)
- Setup Superuser

### Modals/Dialogs
- Company create/edit/status change
- Invite/assign user (if applicable)
- Affiliate create/edit/status change (manual)
- Affiliate link/codes management (if used)
- Affiliate payout approval
- Invoice details
- Update invoice status
- Edit plan limits
- Edit prices
- Plan template dialog
- Subscription history
- AI prompt logs viewer

## Company (Client)
### Core pages
- Dashboard
- Schedule (Calendar)
- Live Chat (WhatsApp)
- AI Usage / AI Settings
- Contacts > WhatsApp
- Contacts > Patients
- CRM
- Reports

### Settings pages
- Company Data
- Professionals
- Services
- Availability
- Scheduling Rules
- Users
- Tags
- Auto Messages
- Visual (brand)
- FAQ
- Support
- WhatsApp Connection (status, QR code, phone code)
- Security (MFA, devices, backup codes)

### Setup pages
- Payment

### Modals/Dialogs
- Appointment dialog (create/edit)
- Appointment details
- Quick appointment
- Contact dialog
- Contact history
- Contact search/select
- Invite user
- Edit user data
- Edit user role
- Permissions accordion
- Professional dialog
- Service dialog
- Availability schedules (company/professional/service)
- Auto message dialog
- FAQ dialog
- Tag management (create/rename/delete/bulk)
- Color picker
- Logo upload
- Variable editor
- Time picker / Time range input
- Billing related dialogs (if exposed)
- Contact import (CSV) wizard (post-MVP)
- "Perdi acesso / Resetar 2FA" (admin flow → support request)

## AI / WhatsApp specific
- Conversation list
- Conversation context menu
- Chat message list
- Chat input
- Profile picture dialog
- Urgent alerts
- AI on/off controls
- Escalation/urgency indicators

## Reports & Dashboard Widgets
- KPI cards
- Charts: monthly revenue, appointments, token usage
- Recent activities
- Top companies table (superuser)
- Professionals performance

## Auto Messages Editor (Detailed)
- Per message type card with: title, description, active toggle, reset to default
- Content editor with token chips
- Protected token insertion (no typing/paste)
- Live preview with sample data

## Localization
- All labels and helper text must be localizable (PT-BR first)

## Affiliate (Non-superuser)
### Pages
- Affiliate Dashboard (own performance)
- Affiliate Companies/Referrals (list of companies attributed)
- Affiliate Payouts (history + status)
- Affiliate Settings (profile + payout onboarding status)
- Affiliate Security (MFA, devices, backup codes)

### Modals/Dialogs
- View commission details
- Request payout (optional, if manual approvals)
- "Perdi acesso / Resetar 2FA" (affiliate flow → support request)


# ZapGenda

SaaS de agendamento via WhatsApp para clínicas de saúde e estética.
AI-first, multi-tenant, com foco em automação de agenda, operação da clínica e comunicação com pacientes.

## Documentação principal
- `ZAPGENDA_PRODUCT_BLUEPRINT.md` — documento principal do produto; define o que o sistema é e o que precisa ter
- `ZAPGENDA_IMPLEMENTED_STATE.md` — retrato vivo do que já foi implementado e do nível de validação atual
- `ZAPGENDA_LAUNCH_PLAN.md` — plano vivo do que falta até lançar o MVP
- `ZAPGENDA_SUPABASE_DOC.md` — referência técnica de Supabase/infrastrutura

## Estrutura documental
### Fonte oficial atual
- `README.md`
- `ZAPGENDA_PRODUCT_BLUEPRINT.md`
- `ZAPGENDA_IMPLEMENTED_STATE.md`
- `ZAPGENDA_LAUNCH_PLAN.md`
- `ZAPGENDA_SUPABASE_DOC.md`

### Arquivo legado / referência histórica
- `docs-legacy/ZAPGENDA_SYSTEM_SPEC.md`
- `docs-legacy/ZAPGENDA_UI_REQUIREMENTS.md`
- `docs-legacy/ZAPGENDA_EXECUTION_PLAN.md`
- `docs-legacy/ZAPGENDA_MVP_CHECKLIST.md`
- `docs-legacy/ZAPGENDA_HANDOFF_CHECKLIST.md`

## Visão geral do produto
- Atendimento automatizado com IA, com comportamento de assistente humano e não chatbot engessado
- Agenda por empresa, com timezone por empresa
- Mensagens automáticas configuráveis por empresa
- Integração com WhatsApp via Z-API
- Fluxo principal do MVP centrado em onboarding, configuração operacional da clínica, agendamento e automações críticas

## Stack (MVP)
- Frontend: Vite + React + TypeScript
- Backend: Supabase (DB, Auth, Edge Functions)
- Deploy: Vercel

## Status
MVP em desenvolvimento.
A base local está relativamente madura; o principal gargalo atual é validação ponta a ponta em ambiente real com credenciais, deploy e smoke test completo.

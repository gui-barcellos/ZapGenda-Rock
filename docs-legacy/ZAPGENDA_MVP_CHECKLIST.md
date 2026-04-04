# ZapGenda MVP Checklist (Prioridade)

Last updated: 2026-03-24

## Snapshot auditado em 2026-03-24
- [x] Fluxo local do MVP mais coerente
- [x] Onboarding guiado e empty states melhores
- [x] Proteção contra estados enganosos antes da configuração mínima
- [x] Reset de senha / aceite de convite ajustados no frontend
- [x] Rotas frontend confirmadas para `/auth/reset` e `/accept-invite`
- [x] App local resiliente sem env do Supabase
- [x] Criação, edição e remarcação de agendamentos passando pela mesma validação
- [x] Validação de disponibilidade, conflito, vínculo serviço-profissional, regras de agenda e bloqueios de slots
- [x] `npm run build` passando em 2026-03-24
- [x] Servidor dev local persistente na porta 8080 via systemd user
- [x] Documentação de handoff criada
- [x] Plano macro de finalização consolidado
- [ ] `npm run lint` passando no repositório inteiro (continua falhando; ~345 problemas no último run)
- [ ] Smoke test credenciado ponta a ponta executado

## Precisa de credencial
- [ ] Supabase real configurado (URL, anon key, service role, projeto alvo)
- [ ] Auth real validado ponta a ponta
- [ ] Edge functions publicadas no projeto alvo
- [ ] Resend/email real validado para reset/invite
- [ ] Z-API real configurada e pareada
- [ ] Webhook real da Z-API validado
- [ ] Vercel com env vars corretas e deploy validado
- [ ] Stripe configurado e validado, se entrar no corte final

## P0 - Bloqueadores para rodar MVP em ambiente real
- [ ] Configurar `.env.local` do frontend com `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`
- [ ] Subir e validar Supabase real
- [ ] Publicar edge functions críticas
- [ ] Confirmar edge functions com secrets corretos (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `APP_URL`)
- [ ] Validar auth real (login, reset, invite)
- [ ] Validar criação de empresa (`create-company`) sem erro e com registro em `companies`
- [ ] Validar envio de email de definição de senha (Resend) no fluxo de criação da empresa
- [ ] Confirmar login admin criado via email (senha definida) e acesso ao dashboard da empresa
- [ ] Validar fluxo real de convite de usuário (`/accept-invite`) com token de email
- [ ] Configurar Z-API real
- [ ] Validar webhook + recebimento/envio
- [ ] Validar conexão WhatsApp via QR e via número (Z-API)
- [ ] Garantir que mensagens automáticas apareçam no chat ao vivo (espelho exato)
- [ ] Testar criação de agendamento ponta a ponta
- [ ] Validar timezone em ambiente real
- [ ] Empresa consegue entrar no sistema
- [ ] Empresa consegue configurar profissional, serviço e disponibilidade
- [ ] WhatsApp conecta de verdade
- [ ] Cliente consegue pedir horário
- [ ] Sistema cria, confirma, remarca e cancela sem conflito indevido
- [ ] Lembrete/confirmação automática funciona em ambiente real

## P1 - Fluxos críticos do produto
- [x] Onboarding minimo (servicos, profissionais, horarios, primeiro agendamento). _Fluxo local ficou guiado com checklist/CTAs in-app e sem dead-ends óbvios; a validacao que falta agora e live/credenciada, nao de UX local._
- [ ] Fluxo de confirmacao (72h) e lembrete (24h) funcionando com linguagem da clinica
- [ ] Regras de cancelamento (somente explicito) e reembolso de estado no show
- [ ] Reagendamento via IA (sem subentendidos) com confirmacao explicita
- [x] Status de agendamento e alteracao manual via UI com validacao local mais segura. _Criacao, edicao e remarcacao agora passam pela mesma pipeline de validacao; ainda falta validacao real conectada com Supabase + automacoes/live chat._
- [ ] No-show automatico (opcional) respeitando configuracao da clinica
- [ ] Testar confirmação e reminder reais

## P1.5 - Sanidade operacional antes do hookup final
- [ ] Executar smoke test guiado com credenciais reais seguindo `ZAPGENDA_HANDOFF_CHECKLIST.md`
- [ ] Separar claramente nos docs o que está "implementado", "validado local", "validado real"
- [ ] Classificar os principais erros de lint por impacto no MVP (crítico vs legado)
- [ ] Verificar se as edge functions críticas de auth/WhatsApp refletem os fluxos documentados

## P2 - Operação, deploy e suporte
- [ ] Vercel com env vars corretas e deploy validado
- [ ] Dashboard SuperUser: listar empresas, filtros, status e ações (reenviar link senha)
- [ ] Painel afiliado (self + super) com clientes e comissões
- [x] Logs auditáveis para ações críticas de agendamento já instrumentados em pontos principais (`create/update/cancel/confirm/complete/no_show/delete`); falta validar em ambiente real e revisar cobertura restante
- [x] Documentação de infraestrutura e handoff atualizada
- [x] App local exibe aviso amigável quando faltar config do Supabase (sem tela branca)
- [ ] Reduzir seletivamente a dívida de lint do caminho crítico sem perseguir o repo inteiro

## P3 - Polimento e preparação
- [ ] Inconsistências visuais menores
- [ ] Ajustes pequenos de dashboard
- [ ] Copy/onboarding ainda refinável
- [ ] Internacionalizacao base (pt como padrao, estrutura pronta para outros idiomas)
- [ ] Importacao de contatos (CSV simples)
- [ ] Definir limites de IA (pendente escolha de provedor)
- [ ] Ajustes de UI/UX e microflows (toasts, estados vazios)
- [ ] Refactors não bloqueantes
- [ ] Documentação extra além do essencial

## P4 - Pós-MVP
- [ ] Stripe configurado e validado, se entrar no corte final
- [ ] Integracao automatica Z-API (criacao de instancia automatizada)
- [ ] Integracao Google Calendar
- [ ] Outros idiomas ativados (es, en)

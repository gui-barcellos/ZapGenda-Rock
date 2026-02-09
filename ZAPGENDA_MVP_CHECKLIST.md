# ZapGenda MVP Checklist (Prioridade)

## P0 - Bloqueadores para rodar MVP
- [ ] Validar criacao de empresa (create-company) sem erro e com registro em `companies`.
- [ ] Validar envio de email de definicao de senha (Resend) no fluxo de criacao da empresa.
- [x] Aplicar migration `supabase_settings` no Supabase e testar salvamento via SuperUser.
- [ ] Confirmar login admin criado via email (senha definida) e acesso ao dashboard da empresa.
- [ ] Confirmar edge functions com secrets corretos (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, APP_URL).
- [ ] Validar conexao WhatsApp via QR e via numero (Z-API).
- [ ] Garantir que mensagens automaticas aparecam no chat ao vivo (espelho exato).

## P1 - Fluxos criticos do produto
- [ ] Onboarding minimo (servicos, profissionais, horarios, primeiro agendamento).
- [ ] Fluxo de confirmacao (72h) e lembrete (24h) funcionando com linguagem da clinica.
- [ ] Regras de cancelamento (somente explicito) e reembolso de estado no show.
- [ ] Reagendamento via IA (sem subentendidos) com confirmacao explicita.
- [ ] Status de agendamento e alteracao manual via UI funcionando.
- [ ] No-show automatico (opcional) respeitando configuracao da clinica.

## P2 - Operacao e suporte
- [ ] Dashboard SuperUser: listar empresas, filtros, status e acoes (reenviar link senha).
- [ ] Painel afiliado (self + super) com clientes e comissoes.
- [ ] Logs auditaveis para acoes criticas (cancelar, reagendar, editar).
- [x] Documentacao de infraestrutura e supabase atualizada.

## P3 - Polimento e preparacao
- [ ] Internacionalizacao base (pt como padrao, estrutura pronta para outros idiomas).
- [ ] Importacao de contatos (CSV simples).
- [ ] Definir limites de IA (pendente escolha de provedor).
- [ ] Ajustes de UI/UX e microflows (toasts, estados vazios).

## P4 - Pos-MVP (registrar no spec)
- [ ] Integracao automatica Z-API (criacao de instancia automatizada).
- [ ] Integracao Google Calendar.
- [ ] Outros idiomas ativados (es, en).

-- Habilitar RLS na tabela plan_templates que estava faltando
ALTER TABLE plan_templates ENABLE ROW LEVEL SECURITY;

-- SuperUser pode gerenciar templates de plano
CREATE POLICY "Superuser plan_templates" ON plan_templates FOR ALL TO authenticated 
USING (has_role(auth.uid(), 'superuser')) 
WITH CHECK (has_role(auth.uid(), 'superuser'));

-- Todos podem visualizar templates ativos
CREATE POLICY "View active plan_templates" ON plan_templates FOR SELECT TO authenticated 
USING (is_active = true);
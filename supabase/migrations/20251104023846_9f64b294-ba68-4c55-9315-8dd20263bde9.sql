-- Criar tabela de convites de usuários
CREATE TABLE IF NOT EXISTS user_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role app_role NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  UNIQUE(company_id, email)
);

-- Habilitar RLS
ALTER TABLE user_invites ENABLE ROW LEVEL SECURITY;

-- Policy: Admin Original pode ver/gerenciar convites da sua empresa
CREATE POLICY "Admin original can manage invites"
ON user_invites
FOR ALL
USING (
  company_id IN (
    SELECT c.id FROM companies c
    INNER JOIN profiles p ON p.email = c.owner_email
    WHERE p.id = auth.uid()
  )
)
WITH CHECK (
  company_id IN (
    SELECT c.id FROM companies c
    INNER JOIN profiles p ON p.email = c.owner_email
    WHERE p.id = auth.uid()
  )
);

-- Índices para performance
CREATE INDEX idx_user_invites_company_id ON user_invites(company_id);
CREATE INDEX idx_user_invites_email ON user_invites(email);
CREATE INDEX idx_user_invites_status ON user_invites(status);
CREATE INDEX idx_user_invites_token ON user_invites(invite_token);

-- Adicionar coluna is_active em profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Índice para performance
CREATE INDEX idx_profiles_is_active ON profiles(is_active);
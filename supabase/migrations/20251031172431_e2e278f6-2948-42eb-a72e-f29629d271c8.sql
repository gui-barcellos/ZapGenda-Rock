-- Adicionar colunas para sistema de bloqueios gerais
ALTER TABLE blocked_slots ADD COLUMN IF NOT EXISTS is_general_block BOOLEAN DEFAULT false;
ALTER TABLE blocked_slots ADD COLUMN IF NOT EXISTS general_block_group_id UUID;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_blocked_slots_general_group ON blocked_slots(general_block_group_id);

-- Função para aplicar bloqueios gerais a novos profissionais
CREATE OR REPLACE FUNCTION apply_general_blocks_to_new_professional()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Quando um profissional é criado, copiar todos os bloqueios gerais futuros
  INSERT INTO blocked_slots (
    company_id,
    professional_id,
    date,
    reason,
    is_general_block,
    general_block_group_id
  )
  SELECT 
    NEW.company_id,
    NEW.id,
    bs.date,
    bs.reason,
    true,
    bs.general_block_group_id
  FROM blocked_slots bs
  WHERE bs.company_id = NEW.company_id
    AND bs.is_general_block = true
    AND bs.date >= CURRENT_DATE
    AND bs.general_block_group_id IS NOT NULL
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_apply_general_blocks ON professionals;
CREATE TRIGGER trigger_apply_general_blocks
  AFTER INSERT ON professionals
  FOR EACH ROW
  EXECUTE FUNCTION apply_general_blocks_to_new_professional();
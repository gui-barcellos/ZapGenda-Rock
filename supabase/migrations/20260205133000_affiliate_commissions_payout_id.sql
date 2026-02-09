ALTER TABLE affiliate_commissions
ADD COLUMN IF NOT EXISTS payout_id UUID REFERENCES affiliate_payouts(id);

CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_payout
  ON affiliate_commissions(payout_id);

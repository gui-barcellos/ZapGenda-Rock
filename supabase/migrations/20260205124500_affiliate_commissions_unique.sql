-- Prevent duplicate commissions per affiliate/invoice
ALTER TABLE affiliate_commissions
ADD CONSTRAINT affiliate_commissions_unique_invoice
UNIQUE (affiliate_id, invoice_id);

CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_invoice
  ON affiliate_commissions(invoice_id);

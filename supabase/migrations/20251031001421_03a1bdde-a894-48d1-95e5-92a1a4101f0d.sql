-- Add Stripe product and price IDs to resource_prices table
ALTER TABLE resource_prices 
ADD COLUMN IF NOT EXISTS stripe_product_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_resource_prices_stripe_product 
ON resource_prices(stripe_product_id);

CREATE INDEX IF NOT EXISTS idx_resource_prices_stripe_price 
ON resource_prices(stripe_price_id);
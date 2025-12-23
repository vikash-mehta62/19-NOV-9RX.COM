-- Add discount columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_details jsonb DEFAULT '[]'::jsonb;

-- Add index for discount queries
CREATE INDEX IF NOT EXISTS idx_orders_discount_amount ON orders(discount_amount) WHERE discount_amount > 0;

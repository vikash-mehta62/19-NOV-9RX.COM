-- Add cost_price column to product_sizes table for inventory cost tracking
-- This is separate from the selling price and will be updated via weighted average on PO approval

-- Add cost_price column
ALTER TABLE product_sizes 
ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2) DEFAULT 0;

-- Initialize cost_price with current price for existing records (one-time migration)
UPDATE product_sizes 
SET cost_price = price 
WHERE cost_price IS NULL OR cost_price = 0;

-- Add comment for documentation
COMMENT ON COLUMN product_sizes.cost_price IS 'Average cost price for inventory tracking (updated via weighted average on PO approval). Separate from selling price.';

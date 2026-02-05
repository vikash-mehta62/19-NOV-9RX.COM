-- Sync cost_price with price column for all product_sizes
-- This ensures cost_price matches the current selling price

-- Update all records to set cost_price equal to price
UPDATE product_sizes 
SET cost_price = price
WHERE cost_price IS NULL OR cost_price != price;

-- Add comment for documentation
COMMENT ON COLUMN product_sizes.cost_price IS 'Average cost price for inventory tracking (updated via weighted average on PO approval). Initially set to match selling price.';

-- Verify the update
DO $$
DECLARE
  total_count INTEGER;
  synced_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM product_sizes;
  SELECT COUNT(*) INTO synced_count FROM product_sizes WHERE cost_price = price;
  
  RAISE NOTICE 'Migration Complete:';
  RAISE NOTICE 'Total product sizes: %', total_count;
  RAISE NOTICE 'Synced records (cost_price = price): %', synced_count;
  RAISE NOTICE 'Percentage synced: %', ROUND((synced_count::DECIMAL / NULLIF(total_count, 0) * 100), 2);
END $$;

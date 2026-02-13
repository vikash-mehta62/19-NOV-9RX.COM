-- =====================================================
-- Fix Zero Base Prices for Deals of the Day
-- This migration updates products with base_price = 0
-- to use the minimum price from their product_sizes
-- =====================================================

-- Step 1: Update products with zero base_price
-- Use minimum price from product_sizes where available
UPDATE products
SET base_price = sub.min_price,
    updated_at = NOW()
FROM (
  SELECT product_id, MIN(price) AS min_price
  FROM product_sizes
  WHERE price > 0
  GROUP BY product_id
) AS sub
WHERE products.id = sub.product_id
  AND (products.base_price = 0 OR products.base_price IS NULL);

-- Step 2: Log the update
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM products
  WHERE base_price > 0 
    AND id IN (
      SELECT DISTINCT product_id 
      FROM product_sizes 
      WHERE price > 0
    );
  
  RAISE NOTICE 'Updated % products with zero base_price', updated_count;
END $$;

-- Step 3: Add validation function to prevent zero prices in deals
CREATE OR REPLACE FUNCTION validate_deal_product_price()
RETURNS TRIGGER AS $$
DECLARE
  product_price NUMERIC;
BEGIN
  -- Get the product's base_price
  SELECT base_price INTO product_price
  FROM products
  WHERE id = NEW.product_id;
  
  -- Warn if price is zero or null
  IF product_price IS NULL OR product_price = 0 THEN
    RAISE WARNING 'Product % has zero or null base_price. Deal may not display correctly.', NEW.product_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger to validate deals
DROP TRIGGER IF EXISTS trigger_validate_deal_product_price ON daily_deals;
CREATE TRIGGER trigger_validate_deal_product_price
  BEFORE INSERT OR UPDATE ON daily_deals
  FOR EACH ROW
  EXECUTE FUNCTION validate_deal_product_price();

-- Step 5: Create view for deal products with calculated prices
CREATE OR REPLACE VIEW daily_deals_with_prices AS
SELECT 
  dd.id as deal_id,
  dd.product_id,
  dd.discount_percent,
  dd.badge_type,
  dd.is_active,
  dd.start_date,
  dd.end_date,
  dd.display_order,
  p.name as product_name,
  p.sku,
  p.base_price as original_price,
  p.image_url,
  -- Calculate deal price
  CASE 
    WHEN p.base_price > 0 THEN p.base_price * (1 - dd.discount_percent / 100.0)
    ELSE (
      SELECT MIN(price) * (1 - dd.discount_percent / 100.0)
      FROM product_sizes ps
      WHERE ps.product_id = p.id AND ps.price > 0
    )
  END as deal_price,
  -- Get minimum size price if base_price is zero
  CASE 
    WHEN p.base_price = 0 OR p.base_price IS NULL THEN (
      SELECT MIN(price)
      FROM product_sizes ps
      WHERE ps.product_id = p.id AND ps.price > 0
    )
    ELSE p.base_price
  END as effective_price
FROM daily_deals dd
JOIN products p ON dd.product_id = p.id;

-- Step 6: Grant access to the view
GRANT SELECT ON daily_deals_with_prices TO authenticated, anon;

-- Step 7: Add comment
COMMENT ON VIEW daily_deals_with_prices IS 'View that calculates deal prices correctly, handling products with zero base_price by using product_sizes minimum price';

-- Step 8: Verification query
DO $$
DECLARE
  zero_price_count INTEGER;
  deal_count INTEGER;
BEGIN
  -- Count products with zero price
  SELECT COUNT(*) INTO zero_price_count
  FROM products
  WHERE base_price = 0 OR base_price IS NULL;
  
  -- Count active deals
  SELECT COUNT(*) INTO deal_count
  FROM daily_deals
  WHERE is_active = true;
  
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Verification Results:';
  RAISE NOTICE 'Products with zero base_price: %', zero_price_count;
  RAISE NOTICE 'Active deals: %', deal_count;
  RAISE NOTICE '===========================================';
END $$;

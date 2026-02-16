-- =====================================================
-- SYNC cost_price FROM price FOR ALL product_sizes
-- Run this in Supabase SQL Editor
-- =====================================================
-- This script copies the selling 'price' to 'cost_price' 
-- for all product sizes where cost_price is NULL or 0.
-- This ensures the weighted average calculation works 
-- correctly when approving future Purchase Orders.
-- =====================================================

-- Step 1: Check how many records need fixing
SELECT 
  COUNT(*) as total_to_fix,
  COUNT(CASE WHEN cost_price IS NULL THEN 1 END) as null_cost_price,
  COUNT(CASE WHEN cost_price = 0 THEN 1 END) as zero_cost_price
FROM product_sizes
WHERE cost_price IS NULL OR cost_price = 0;

-- Step 2: Preview records that will be updated
SELECT 
  ps.id,
  p.name as product_name,
  ps.size_value,
  ps.size_unit,
  ps.stock,
  ps.price as selling_price,
  ps.cost_price as current_cost_price,
  ps.price as will_be_set_to
FROM product_sizes ps
JOIN products p ON p.id = ps.product_id
WHERE ps.cost_price IS NULL OR ps.cost_price = 0
ORDER BY p.name, ps.size_value;

-- Step 3: Copy price to cost_price where cost_price is NULL or 0
UPDATE product_sizes
SET cost_price = price
WHERE cost_price IS NULL OR cost_price = 0;

-- Step 4: Also fix any corrupted cost_price values (suspiciously low from the bug)
-- This finds sizes where cost_price is less than 10% of selling price AND stock > 0
-- These were likely corrupted by the bug where null/0 cost was used in weighted avg
SELECT 
  ps.id,
  p.name as product_name,
  ps.size_value,
  ps.size_unit,
  ps.stock,
  ps.price as selling_price,
  ps.cost_price as corrupted_cost_price,
  ROUND((ps.cost_price / NULLIF(ps.price, 0) * 100)::numeric, 1) as cost_pct_of_price
FROM product_sizes ps
JOIN products p ON p.id = ps.product_id
WHERE ps.cost_price > 0
  AND ps.price > 0
  AND ps.cost_price < ps.price * 0.1
  AND ps.stock > 0
ORDER BY cost_pct_of_price ASC;

-- Step 5: Fix corrupted cost_price values (reset to selling price)
-- Uncomment the UPDATE below after reviewing Step 4 results
-- UPDATE product_sizes
-- SET cost_price = price
-- WHERE cost_price > 0
--   AND price > 0
--   AND cost_price < price * 0.1
--   AND stock > 0;

-- Step 6: Verify - check all records now have valid cost_price
SELECT 
  COUNT(*) as total_sizes,
  COUNT(CASE WHEN cost_price IS NULL OR cost_price = 0 THEN 1 END) as still_missing,
  COUNT(CASE WHEN cost_price > 0 THEN 1 END) as has_cost_price
FROM product_sizes;

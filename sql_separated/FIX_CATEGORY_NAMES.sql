-- =====================================================
-- FIX CATEGORY NAMES - UPDATE BOTH TABLES
-- =====================================================

-- Step 1: Check current state
SELECT 'Current categories in category_configs:' as step;
SELECT category_name FROM category_configs ORDER BY category_name;

SELECT 'Current categories in products:' as step;
SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category;

-- Step 2: Update category_configs table (if needed)
-- Example: If you want to rename "RX LABELS" to something else
-- UPDATE category_configs 
-- SET category_name = 'NEW NAME'
-- WHERE category_name = 'RX LABELS';

-- Step 3: Update products table to match (if needed)
-- UPDATE products 
-- SET category = 'NEW NAME'
-- WHERE category = 'RX LABELS';

-- Step 4: Verify the changes
SELECT 'After update - categories in category_configs:' as step;
SELECT category_name FROM category_configs ORDER BY category_name;

SELECT 'After update - categories in products:' as step;
SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category;

-- =====================================================
-- COMMON SCENARIOS
-- =====================================================

-- Scenario 1: You added new products with new category names
-- but forgot to add them to category_configs
-- Solution: Add missing categories to category_configs
/*
INSERT INTO category_configs (category_name, size_units, default_unit, has_rolls, requires_case)
VALUES 
  ('YOUR NEW CATEGORY', ARRAY['count'], 'count', false, true)
ON CONFLICT (category_name) DO NOTHING;
*/

-- Scenario 2: You want to rename a category everywhere
-- Solution: Update both tables
/*
-- First update category_configs
UPDATE category_configs 
SET category_name = 'NEW CATEGORY NAME'
WHERE category_name = 'OLD CATEGORY NAME';

-- Then update all products
UPDATE products 
SET category = 'NEW CATEGORY NAME'
WHERE category = 'OLD CATEGORY NAME';
*/

-- Scenario 3: Products have categories that don't exist in category_configs
-- Solution: Find and add them
/*
INSERT INTO category_configs (category_name, size_units, default_unit, has_rolls, requires_case)
SELECT DISTINCT 
  p.category,
  ARRAY['count']::TEXT[],
  'count',
  false,
  true
FROM products p
LEFT JOIN category_configs cc ON p.category = cc.category_name
WHERE p.category IS NOT NULL 
  AND cc.category_name IS NULL
ON CONFLICT (category_name) DO NOTHING;
*/

-- =====================================================
-- DEBUG: WHY ONLY 2 CATEGORIES ARE SHOWING
-- =====================================================

-- The code filters categories like this:
-- const sortedCategories = CATEGORY_ORDER.filter(cat => categoryNames.includes(cat));
-- 
-- This means it only shows categories that:
-- 1. Exist in category_configs table
-- 2. Are listed in CATEGORY_ORDER array

-- CATEGORY_ORDER array in code:
-- [
--   "CONTAINERS & CLOSURES",
--   "RX LABELS",
--   "COMPLIANCE PACKAGING",
--   "RX PAPER BAGS",
--   "ORAL SYRINGES & ACCESSORIES",
--   "OTHER SUPPLY"
-- ]

-- =====================================================
-- STEP 1: Check what's in category_configs
-- =====================================================
SELECT 
  'Categories in category_configs table:' as info,
  category_name,
  created_at
FROM category_configs 
ORDER BY category_name;

-- =====================================================
-- STEP 2: Check if category names match exactly
-- =====================================================
-- The filter uses exact string matching (case-sensitive!)
-- Check if your category names match the CATEGORY_ORDER array

SELECT 
  'Checking exact matches:' as info,
  category_name,
  CASE 
    WHEN category_name = 'CONTAINERS & CLOSURES' THEN '✅ MATCH'
    WHEN category_name = 'RX LABELS' THEN '✅ MATCH'
    WHEN category_name = 'COMPLIANCE PACKAGING' THEN '✅ MATCH'
    WHEN category_name = 'RX PAPER BAGS' THEN '✅ MATCH'
    WHEN category_name = 'ORAL SYRINGES & ACCESSORIES' THEN '✅ MATCH'
    WHEN category_name = 'OTHER SUPPLY' THEN '✅ MATCH'
    ELSE '❌ NO MATCH - Will not display!'
  END as match_status
FROM category_configs 
ORDER BY match_status, category_name;

-- =====================================================
-- STEP 3: Check for common issues
-- =====================================================

-- Issue 1: Extra spaces
SELECT 
  'Categories with extra spaces:' as issue,
  category_name,
  LENGTH(category_name) as length,
  LENGTH(TRIM(category_name)) as trimmed_length,
  CASE 
    WHEN LENGTH(category_name) != LENGTH(TRIM(category_name)) 
    THEN '⚠️ HAS EXTRA SPACES'
    ELSE '✅ OK'
  END as status
FROM category_configs;

-- Issue 2: Case sensitivity
SELECT 
  'Categories with case differences:' as issue,
  category_name,
  UPPER(category_name) as uppercase_version,
  CASE 
    WHEN category_name = UPPER(category_name) THEN '✅ ALL UPPERCASE'
    ELSE '⚠️ Mixed case - might not match'
  END as status
FROM category_configs;

-- Issue 3: Special characters
SELECT 
  'Categories with special characters:' as issue,
  category_name,
  category_name::bytea as hex_representation
FROM category_configs
WHERE category_name ~ '[^A-Z0-9 &-]'; -- Contains characters other than A-Z, 0-9, space, &, -

-- =====================================================
-- STEP 4: Count total categories
-- =====================================================
SELECT 
  'Total categories in database:' as info,
  COUNT(*) as total_count
FROM category_configs;

-- =====================================================
-- STEP 5: Check if products exist for each category
-- =====================================================
SELECT 
  'Products per category:' as info,
  cc.category_name,
  COUNT(p.id) as product_count,
  CASE 
    WHEN COUNT(p.id) = 0 THEN '⚠️ NO PRODUCTS'
    ELSE '✅ HAS PRODUCTS'
  END as status
FROM category_configs cc
LEFT JOIN products p ON p.category = cc.category_name
GROUP BY cc.category_name
ORDER BY product_count DESC;

-- =====================================================
-- POSSIBLE CAUSES
-- =====================================================

-- Cause 1: Only 2 categories exist in category_configs
-- Solution: Insert missing categories

-- Cause 2: Category names don't match exactly (case, spaces, special chars)
-- Solution: Update category names to match CATEGORY_ORDER

-- Cause 3: Categories exist but have no products
-- Solution: This shouldn't hide them, but check anyway

-- =====================================================
-- FIX: Insert missing categories if they don't exist
-- =====================================================

-- Uncomment and run if categories are missing:
/*
INSERT INTO category_configs (category_name, size_units, default_unit, has_rolls, requires_case)
VALUES 
  ('CONTAINERS & CLOSURES', ARRAY['ml', 'oz', 'count'], 'count', false, true),
  ('RX LABELS', ARRAY['count', 'roll'], 'count', true, false),
  ('COMPLIANCE PACKAGING', ARRAY['count', 'pack'], 'count', false, true),
  ('RX PAPER BAGS', ARRAY['count', 'pack'], 'count', false, true),
  ('ORAL SYRINGES & ACCESSORIES', ARRAY['ml', 'count'], 'count', false, true),
  ('OTHER SUPPLY', ARRAY['count', 'box'], 'count', false, true)
ON CONFLICT (category_name) DO NOTHING;
*/

-- =====================================================
-- FIX: Update category names to match exactly
-- =====================================================

-- Example: If you have "Rx Labels" instead of "RX LABELS"
/*
UPDATE category_configs 
SET category_name = 'RX LABELS'
WHERE UPPER(category_name) = 'RX LABELS' 
  AND category_name != 'RX LABELS';
*/

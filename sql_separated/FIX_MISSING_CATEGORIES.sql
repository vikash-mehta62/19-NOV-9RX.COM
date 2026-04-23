-- =====================================================
-- FIX: Add Missing Categories to category_configs
-- =====================================================

-- This will add all 6 categories that should appear in the UI
-- The UI only shows categories that exist in both:
-- 1. category_configs table (database)
-- 2. CATEGORY_ORDER array (code)

-- =====================================================
-- STEP 1: Check current state
-- =====================================================
SELECT 'BEFORE FIX - Current categories:' as step;
SELECT category_name FROM category_configs ORDER BY category_name;

-- =====================================================
-- STEP 2: Insert all required categories
-- =====================================================
INSERT INTO category_configs (category_name, size_units, default_unit, has_rolls, requires_case)
VALUES 
  ('CONTAINERS & CLOSURES', ARRAY['ml', 'oz', 'count'], 'count', false, true),
  ('RX LABELS', ARRAY['count', 'roll'], 'count', true, false),
  ('COMPLIANCE PACKAGING', ARRAY['count', 'pack'], 'count', false, true),
  ('RX PAPER BAGS', ARRAY['count', 'pack'], 'count', false, true),
  ('ORAL SYRINGES & ACCESSORIES', ARRAY['ml', 'count'], 'count', false, true),
  ('OTHER SUPPLY', ARRAY['count', 'box'], 'count', false, true)
ON CONFLICT (category_name) DO UPDATE SET
  size_units = EXCLUDED.size_units,
  default_unit = EXCLUDED.default_unit,
  has_rolls = EXCLUDED.has_rolls,
  requires_case = EXCLUDED.requires_case,
  updated_at = NOW();

-- =====================================================
-- STEP 3: Verify the fix
-- =====================================================
SELECT 'AFTER FIX - All categories:' as step;
SELECT category_name FROM category_configs ORDER BY category_name;

-- =====================================================
-- STEP 4: Check if products exist for these categories
-- =====================================================
SELECT 'Products per category:' as step;
SELECT 
  cc.category_name,
  COUNT(p.id) as product_count
FROM category_configs cc
LEFT JOIN products p ON p.category = cc.category_name
GROUP BY cc.category_name
ORDER BY 
  CASE cc.category_name
    WHEN 'CONTAINERS & CLOSURES' THEN 1
    WHEN 'RX LABELS' THEN 2
    WHEN 'COMPLIANCE PACKAGING' THEN 3
    WHEN 'RX PAPER BAGS' THEN 4
    WHEN 'ORAL SYRINGES & ACCESSORIES' THEN 5
    WHEN 'OTHER SUPPLY' THEN 6
    ELSE 7
  END;

-- =====================================================
-- EXPECTED RESULT
-- =====================================================
-- After running this script, you should see all 6 categories:
-- 1. CONTAINERS & CLOSURES
-- 2. RX LABELS
-- 3. COMPLIANCE PACKAGING
-- 4. RX PAPER BAGS
-- 5. ORAL SYRINGES & ACCESSORIES
-- 6. OTHER SUPPLY

-- If you still only see 2 categories after this:
-- 1. Clear browser cache and refresh
-- 2. Check browser console for errors
-- 3. Verify the category names match EXACTLY (case-sensitive)

-- =====================================================
-- SAFE COMPLETE CATEGORY MIGRATION SCRIPT
-- =====================================================
-- Use this script to completely change all categories safely
-- This ensures no data is lost and all relationships are maintained

-- =====================================================
-- STEP 1: BACKUP (CRITICAL - DO NOT SKIP!)
-- =====================================================
CREATE TABLE IF NOT EXISTS category_configs_backup AS SELECT * FROM category_configs;
CREATE TABLE IF NOT EXISTS subcategory_configs_backup AS SELECT * FROM subcategory_configs;
CREATE TABLE IF NOT EXISTS products_backup AS SELECT * FROM products;

SELECT 'Backup created successfully' as status;

-- =====================================================
-- STEP 2: CHECK CURRENT STATE
-- =====================================================
SELECT '=== CURRENT STATE ===' as info;

SELECT 'Current categories:' as info;
SELECT category_name, COUNT(*) as count FROM category_configs GROUP BY category_name;

SELECT 'Products per category:' as info;
SELECT category, COUNT(*) as product_count FROM products WHERE category IS NOT NULL GROUP BY category;

SELECT 'Subcategories per category:' as info;
SELECT category_name, COUNT(*) as subcategory_count FROM subcategory_configs GROUP BY category_name;

-- =====================================================
-- STEP 3: DEFINE YOUR CATEGORY MAPPING
-- =====================================================
-- IMPORTANT: Customize this mapping based on your needs!
-- Map each OLD category to a NEW category

CREATE TEMP TABLE IF NOT EXISTS category_mapping (
  old_category TEXT PRIMARY KEY,
  new_category TEXT NOT NULL,
  new_size_units TEXT[],
  new_default_unit TEXT,
  new_has_rolls BOOLEAN,
  new_requires_case BOOLEAN
);

-- Example mapping - CUSTOMIZE THIS FOR YOUR NEEDS:
INSERT INTO category_mapping VALUES
  -- Old Category              New Category           Size Units                    Default  Rolls  Case
  ('CONTAINERS & CLOSURES',    'MEDICAL SUPPLIES',    ARRAY['ml', 'oz', 'count'],  'count', false, true),
  ('RX LABELS',                'PHARMACY PRODUCTS',   ARRAY['count', 'roll'],      'count', true,  false),
  ('RX PAPER BAGS',            'PACKAGING MATERIALS', ARRAY['count', 'pack'],      'count', false, true),
  ('COMPLIANCE PACKAGING',     'MEDICAL SUPPLIES',    ARRAY['count', 'pack'],      'count', false, true),
  ('ORAL SYRINGES & ACCESSORIES', 'MEDICAL SUPPLIES', ARRAY['ml', 'count'],        'count', false, true),
  ('OTHER SUPPLY',             'PACKAGING MATERIALS', ARRAY['count', 'box'],       'count', false, true)
ON CONFLICT (old_category) DO UPDATE SET
  new_category = EXCLUDED.new_category,
  new_size_units = EXCLUDED.new_size_units,
  new_default_unit = EXCLUDED.new_default_unit,
  new_has_rolls = EXCLUDED.new_has_rolls,
  new_requires_case = EXCLUDED.new_requires_case;

-- Verify mapping
SELECT 'Category mapping:' as info;
SELECT * FROM category_mapping ORDER BY old_category;

-- =====================================================
-- STEP 4: VALIDATE MAPPING (Check for issues)
-- =====================================================
SELECT '=== VALIDATION ===' as info;

-- Check if all current categories are mapped
SELECT 
  'Unmapped categories (will be lost!):' as warning,
  cc.category_name
FROM category_configs cc
LEFT JOIN category_mapping cm ON cc.category_name = cm.old_category
WHERE cm.old_category IS NULL;

-- Check if all product categories are mapped
SELECT 
  'Unmapped product categories:' as warning,
  p.category,
  COUNT(*) as product_count
FROM products p
LEFT JOIN category_mapping cm ON p.category = cm.old_category
WHERE p.category IS NOT NULL AND cm.old_category IS NULL
GROUP BY p.category;

-- =====================================================
-- STEP 5: PERFORM MIGRATION (Use transaction for safety)
-- =====================================================
BEGIN;

-- 5.1: Update products table (MOST IMPORTANT - do this first!)
UPDATE products p
SET category = cm.new_category
FROM category_mapping cm
WHERE p.category = cm.old_category;

SELECT 'Products updated:' as status, COUNT(*) as count FROM products;

-- 5.2: Update subcategory_configs table
UPDATE subcategory_configs sc
SET category_name = cm.new_category
FROM category_mapping cm
WHERE sc.category_name = cm.old_category;

SELECT 'Subcategories updated:' as status, COUNT(*) as count FROM subcategory_configs;

-- 5.3: Delete old categories from category_configs
DELETE FROM category_configs 
WHERE category_name IN (
  SELECT old_category FROM category_mapping
);

SELECT 'Old categories deleted:' as status;

-- 5.4: Insert new categories
INSERT INTO category_configs (category_name, size_units, default_unit, has_rolls, requires_case)
SELECT DISTINCT
  new_category,
  new_size_units,
  new_default_unit,
  new_has_rolls,
  new_requires_case
FROM category_mapping
ON CONFLICT (category_name) DO UPDATE SET
  size_units = EXCLUDED.size_units,
  default_unit = EXCLUDED.default_unit,
  has_rolls = EXCLUDED.has_rolls,
  requires_case = EXCLUDED.requires_case,
  updated_at = NOW();

SELECT 'New categories inserted:' as status;

-- COMMIT or ROLLBACK?
-- If everything looks good, COMMIT. If there are issues, ROLLBACK.
COMMIT;
-- ROLLBACK; -- Uncomment this instead if you want to undo

-- =====================================================
-- STEP 6: VERIFY MIGRATION SUCCESS
-- =====================================================
SELECT '=== VERIFICATION ===' as info;

-- 6.1: Check new categories exist
SELECT 'New categories in category_configs:' as info;
SELECT category_name FROM category_configs ORDER BY category_name;

-- 6.2: Check products have valid categories
SELECT 'Products with valid categories:' as info;
SELECT 
  p.category,
  COUNT(*) as product_count
FROM products p
INNER JOIN category_configs cc ON p.category = cc.category_name
GROUP BY p.category
ORDER BY p.category;

-- 6.3: Check for orphaned products (should be 0!)
SELECT 'Orphaned products (should be 0):' as warning;
SELECT 
  p.id,
  p.name,
  p.category as invalid_category
FROM products p
LEFT JOIN category_configs cc ON p.category = cc.category_name
WHERE p.category IS NOT NULL AND cc.category_name IS NULL
LIMIT 10;

-- 6.4: Check for orphaned subcategories (should be 0!)
SELECT 'Orphaned subcategories (should be 0):' as warning;
SELECT 
  sc.id,
  sc.category_name as invalid_category,
  sc.subcategory_name
FROM subcategory_configs sc
LEFT JOIN category_configs cc ON sc.category_name = cc.category_name
WHERE cc.category_name IS NULL
LIMIT 10;

-- 6.5: Summary statistics
SELECT 'Migration summary:' as info;
SELECT 
  'Categories' as table_name,
  COUNT(*) as total_count
FROM category_configs
UNION ALL
SELECT 
  'Subcategories',
  COUNT(*)
FROM subcategory_configs
UNION ALL
SELECT 
  'Products',
  COUNT(*)
FROM products
UNION ALL
SELECT 
  'Products with valid category',
  COUNT(*)
FROM products p
INNER JOIN category_configs cc ON p.category = cc.category_name;

-- =====================================================
-- STEP 7: CLEANUP (Optional)
-- =====================================================
-- Drop temporary mapping table
DROP TABLE IF EXISTS category_mapping;

-- Keep backups for safety (drop them later after confirming everything works)
-- DROP TABLE IF EXISTS category_configs_backup;
-- DROP TABLE IF EXISTS subcategory_configs_backup;
-- DROP TABLE IF EXISTS products_backup;

SELECT 'Migration completed successfully!' as status;

-- =====================================================
-- STEP 8: RESTORE FROM BACKUP (If something went wrong)
-- =====================================================
-- Uncomment these lines ONLY if you need to restore:
/*
BEGIN;

-- Restore category_configs
DELETE FROM category_configs;
INSERT INTO category_configs SELECT * FROM category_configs_backup;

-- Restore subcategory_configs
DELETE FROM subcategory_configs;
INSERT INTO subcategory_configs SELECT * FROM subcategory_configs_backup;

-- Restore products
UPDATE products p
SET category = pb.category
FROM products_backup pb
WHERE p.id = pb.id;

COMMIT;

SELECT 'Restored from backup successfully!' as status;
*/

-- =====================================================
-- STEP 9: UPDATE FRONTEND CODE
-- =====================================================
-- After running this script, you MUST update the CATEGORY_ORDER arrays in:
-- 
-- 1. src/pages/admin/Products.tsx (line 84)
-- 2. src/components/pharmacy/PharmacyProductsFullPage.tsx (line 85)
-- 3. src/components/pharmacy/components/product-showcase/PharmacyFilterSidebar.tsx (line 58)
-- 4. src/components/orders/wizard/steps/ProductSelectionStep.tsx (line 26)
-- 5. src/pages/Products.tsx (line 44)
--
-- Change from:
-- const CATEGORY_ORDER = [
--   "CONTAINERS & CLOSURES",
--   "RX LABELS",
--   "RX PAPER BAGS",
--   ...
-- ];
--
-- To your new categories:
-- const CATEGORY_ORDER = [
--   "MEDICAL SUPPLIES",
--   "PHARMACY PRODUCTS",
--   "PACKAGING MATERIALS",
--   ...
-- ];

-- =====================================================
-- NOTES
-- =====================================================
-- 1. Always test in development environment first!
-- 2. Backup is created automatically at the start
-- 3. Transaction ensures all-or-nothing (COMMIT or ROLLBACK)
-- 4. Verification queries help you confirm success
-- 5. Keep backups until you're 100% sure everything works
-- 6. Update frontend code after database migration
-- 7. Clear browser cache after changes

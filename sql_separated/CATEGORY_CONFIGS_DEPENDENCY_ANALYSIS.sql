-- =====================================================
-- CATEGORY_CONFIGS TABLE DEPENDENCY ANALYSIS
-- =====================================================

-- SUMMARY:
-- The category_configs table is INDEPENDENT - it has NO foreign key constraints
-- However, it is REFERENCED by many parts of the application

-- =====================================================
-- 1. DATABASE STRUCTURE
-- =====================================================

-- category_configs table structure:
-- - id (BIGSERIAL PRIMARY KEY)
-- - category_name (TEXT NOT NULL, UNIQUE)
-- - size_units (TEXT[])
-- - default_unit (TEXT)
-- - has_rolls (BOOLEAN)
-- - requires_case (BOOLEAN)
-- - created_at (TIMESTAMPTZ)
-- - updated_at (TIMESTAMPTZ)

-- subcategory_configs table structure:
-- - id (BIGSERIAL PRIMARY KEY)
-- - category_name (TEXT NOT NULL) -- Links to category_configs.category_name (NO FOREIGN KEY!)
-- - subcategory_name (TEXT NOT NULL)
-- - created_at (TIMESTAMPTZ)
-- - updated_at (TIMESTAMPTZ)
-- - UNIQUE(category_name, subcategory_name)

-- products table:
-- - category (TEXT) -- Links to category_configs.category_name (NO FOREIGN KEY!)
-- - subcategory (TEXT) -- Links to subcategory_configs.subcategory_name (NO FOREIGN KEY!)

-- =====================================================
-- 2. IMPORTANT FINDINGS
-- =====================================================

-- ❌ NO FOREIGN KEY CONSTRAINTS EXIST!
-- The relationships are LOGICAL only, not enforced by the database
-- This means:
-- 1. You CAN delete/update categories without cascade effects
-- 2. You CAN have orphaned data (products with non-existent categories)
-- 3. Data integrity is NOT enforced at database level

-- =====================================================
-- 3. TABLES THAT USE category_configs
-- =====================================================

-- Direct Usage (via application code):
-- 1. products table - stores category and subcategory as TEXT
-- 2. subcategory_configs table - stores category_name as TEXT
-- 3. offers table - may filter by category
-- 4. banners table - may target specific categories
-- 5. email_campaigns - may segment by category

-- =====================================================
-- 4. APPLICATION CODE THAT QUERIES category_configs
-- =====================================================

-- Frontend Components (15+ files):
-- 1. src/pages/admin/Products.tsx - Displays category cards
-- 2. src/pages/admin/Banners.tsx - Category selection for banners
-- 3. src/pages/admin/Offers.tsx - Category selection for offers
-- 4. src/pages/pharmacy/CategoryBrowse.tsx - Category browsing
-- 5. src/components/products/AddProductDialog.tsx - Product form
-- 6. src/components/products/form-sections/CategorySubcategoryManager.tsx - Category management
-- 7. src/components/products/form-sections/AddCategory.tsx - Add new category
-- 8. src/components/admin/CategoryManagement.tsx - Category CRUD
-- 9. src/components/pharmacy/PharmacyProductsFullPage.tsx - Pharmacy products
-- 10. src/components/pharmacy/components/CategoryCards.tsx - Category display
-- 11. src/components/pharmacy/components/CategoryPills.tsx - Category filters
-- 12. src/components/pharmacy/components/product-showcase/PharmacyFilterSidebar.tsx
-- 13. src/components/pharmacy/components/product-showcase/SearchFilters.tsx
-- 14. src/App.tsx - fetchCategoryConfigs() function

-- =====================================================
-- 5. WHAT HAPPENS IF YOU UPDATE/DELETE A CATEGORY?
-- =====================================================

-- Scenario 1: UPDATE category_configs.category_name
-- ✅ category_configs table - Updated successfully
-- ❌ subcategory_configs table - OLD category_name remains (orphaned!)
-- ❌ products table - OLD category remains (orphaned!)
-- ❌ Application will show mismatched data

-- Scenario 2: DELETE from category_configs
-- ✅ category_configs table - Deleted successfully
-- ❌ subcategory_configs table - Orphaned subcategories remain
-- ❌ products table - Orphaned products remain
-- ❌ Application may show products with non-existent categories

-- =====================================================
-- 6. SAFE UPDATE PROCEDURE
-- =====================================================

-- To safely rename a category, you MUST update 3 tables:

-- Step 1: Update category_configs
UPDATE category_configs 
SET category_name = 'NEW CATEGORY NAME'
WHERE category_name = 'OLD CATEGORY NAME';

-- Step 2: Update subcategory_configs
UPDATE subcategory_configs 
SET category_name = 'NEW CATEGORY NAME'
WHERE category_name = 'OLD CATEGORY NAME';

-- Step 3: Update products
UPDATE products 
SET category = 'NEW CATEGORY NAME'
WHERE category = 'OLD CATEGORY NAME';

-- Step 4: Verify the changes
SELECT 'Categories:' as table_name, category_name as name FROM category_configs
UNION ALL
SELECT 'Subcategories:', category_name FROM subcategory_configs WHERE category_name = 'NEW CATEGORY NAME'
UNION ALL
SELECT 'Products:', category FROM products WHERE category = 'NEW CATEGORY NAME' LIMIT 5;

-- =====================================================
-- 7. SAFE DELETE PROCEDURE
-- =====================================================

-- To safely delete a category:

-- Step 1: Check if category is in use
SELECT 
  'Products using this category:' as info,
  COUNT(*) as count
FROM products 
WHERE category = 'CATEGORY TO DELETE';

-- Step 2: Delete or reassign products first
-- Option A: Delete products
-- DELETE FROM products WHERE category = 'CATEGORY TO DELETE';

-- Option B: Reassign to another category
-- UPDATE products 
-- SET category = 'OTHER CATEGORY', subcategory = NULL
-- WHERE category = 'CATEGORY TO DELETE';

-- Step 3: Delete subcategories
DELETE FROM subcategory_configs 
WHERE category_name = 'CATEGORY TO DELETE';

-- Step 4: Delete category
DELETE FROM category_configs 
WHERE category_name = 'CATEGORY TO DELETE';

-- =====================================================
-- 8. RECOMMENDED: ADD FOREIGN KEY CONSTRAINTS
-- =====================================================

-- To enforce data integrity, consider adding foreign keys:

-- Add foreign key to subcategory_configs
-- WARNING: This will fail if orphaned data exists!
/*
ALTER TABLE subcategory_configs
ADD CONSTRAINT fk_subcategory_category
FOREIGN KEY (category_name) 
REFERENCES category_configs(category_name)
ON UPDATE CASCADE
ON DELETE CASCADE;
*/

-- Add foreign key to products
-- WARNING: This will fail if orphaned data exists!
/*
ALTER TABLE products
ADD CONSTRAINT fk_product_category
FOREIGN KEY (category) 
REFERENCES category_configs(category_name)
ON UPDATE CASCADE
ON DELETE RESTRICT; -- Prevent deletion if products exist
*/

-- =====================================================
-- 9. CHECK FOR ORPHANED DATA
-- =====================================================

-- Find products with non-existent categories
SELECT 
  'Orphaned Products:' as issue,
  p.id,
  p.name,
  p.category,
  p.subcategory
FROM products p
LEFT JOIN category_configs cc ON p.category = cc.category_name
WHERE p.category IS NOT NULL 
  AND cc.category_name IS NULL;

-- Find subcategories with non-existent categories
SELECT 
  'Orphaned Subcategories:' as issue,
  sc.id,
  sc.category_name,
  sc.subcategory_name
FROM subcategory_configs sc
LEFT JOIN category_configs cc ON sc.category_name = cc.category_name
WHERE cc.category_name IS NULL;

-- =====================================================
-- 10. CONCLUSION
-- =====================================================

-- ANSWER TO YOUR QUESTION:
-- "Is category_configs independent or are some tables using them?"

-- ANSWER: category_configs is STRUCTURALLY INDEPENDENT (no foreign keys)
-- BUT LOGICALLY DEPENDENT (used by many tables and components)

-- IMPACT OF CHANGES:
-- ✅ You CAN modify category_configs without database errors
-- ❌ You MUST manually update related tables (subcategory_configs, products)
-- ❌ Application code expects categories to exist and match
-- ⚠️  Changing categories without updating products will cause data inconsistency

-- RECOMMENDATION:
-- Always update ALL THREE tables when modifying categories:
-- 1. category_configs (master list)
-- 2. subcategory_configs (related subcategories)
-- 3. products (actual product categorization)

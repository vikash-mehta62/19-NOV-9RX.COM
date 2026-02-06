-- =====================================================
-- CHECK WHAT'S IN YOUR DATABASE
-- =====================================================

-- 1. Check all categories in category_configs table
SELECT 'CATEGORIES IN category_configs:' as info;
SELECT category_name, size_units, default_unit, has_rolls, requires_case 
FROM category_configs 
ORDER BY category_name;

-- 2. Check all products and their categories
SELECT 'PRODUCTS AND THEIR CATEGORIES:' as info;
SELECT id, name, category, subcategory, sku 
FROM products 
ORDER BY category, name
LIMIT 50;

-- 3. Check distinct categories from products table
SELECT 'DISTINCT CATEGORIES IN products TABLE:' as info;
SELECT DISTINCT category 
FROM products 
WHERE category IS NOT NULL
ORDER BY category;

-- 4. Count products per category
SELECT 'PRODUCT COUNT PER CATEGORY:' as info;
SELECT category, COUNT(*) as product_count
FROM products
WHERE category IS NOT NULL
GROUP BY category
ORDER BY category;

-- 5. Check if there are any mismatches
SELECT 'CATEGORIES IN products BUT NOT IN category_configs:' as info;
SELECT DISTINCT p.category
FROM products p
LEFT JOIN category_configs cc ON p.category = cc.category_name
WHERE p.category IS NOT NULL 
  AND cc.category_name IS NULL;

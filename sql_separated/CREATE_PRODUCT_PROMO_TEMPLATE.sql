-- Template for Creating Product-Specific Promo Codes
-- Use this template to create new product-based offers

-- ============================================
-- STEP 1: Find Products to Include
-- ============================================

-- Search for products by name
SELECT 
  id,
  name,
  category,
  base_price
FROM products
WHERE name ILIKE '%medicine%'  -- Replace with your search term
ORDER BY name;

-- Get top selling products (if you have sales data)
SELECT 
  p.id,
  p.name,
  p.category,
  p.base_price
FROM products p
ORDER BY p.base_price DESC
LIMIT 10;

-- Get products by category
SELECT 
  id,
  name,
  category,
  base_price
FROM products
WHERE category = 'CONTAINERS & CLOSURES'
ORDER BY name;

-- ============================================
-- STEP 2: Create Product-Specific Offer
-- ============================================

-- Example 1: 20% off specific product
INSERT INTO offers (
  title,
  description,
  offer_type,
  discount_value,
  promo_code,
  applicable_to,
  applicable_ids,  -- ⚠️ IMPORTANT: Use product IDs (UUIDs)!
  min_order_amount,
  is_active,
  start_date,
  end_date,
  used_count
) VALUES (
  '20% Off Medicine Shipping Supply',
  'Get 20% off medicine shipping supplies',
  'percentage',
  20,
  'MEDICINE20',
  'product',  -- ⚠️ Set to 'product'
  ARRAY['07d7cda8-5cfc-4680-9417-f9360464c6c0'],  -- ⚠️ Use product UUID
  0,
  true,
  NOW(),
  NOW() + INTERVAL '30 days',
  0
);

-- Example 2: $15 off multiple products
INSERT INTO offers (
  title,
  description,
  offer_type,
  discount_value,
  promo_code,
  applicable_to,
  applicable_ids,
  min_order_amount,
  is_active,
  start_date,
  end_date,
  used_count
) VALUES (
  '$15 Off Select Products',
  'Save $15 on select products',
  'flat',
  15,
  'SELECT15',
  'product',
  ARRAY[
    '07d7cda8-5cfc-4680-9417-f9360464c6c0',  -- MEDICINE SHIPPING SUPPLY
    '2c93d8c5-6310-4e2b-8954-444780a97daa',  -- OINTMENT JARS
    'b88431c1-5e19-4154-bb75-2b8e935e6244'   -- FLAT BOTTOM STOCK RX BAGS
  ],
  75,  -- Min order $75
  true,
  NOW(),
  NOW() + INTERVAL '30 days',
  0
);

-- Example 3: Buy one get percentage off
INSERT INTO offers (
  title,
  description,
  offer_type,
  discount_value,
  promo_code,
  applicable_to,
  applicable_ids,
  min_order_amount,
  is_active,
  start_date,
  end_date,
  used_count
) VALUES (
  '25% Off Oral Syringes',
  'Get 25% off oral syringes',
  'percentage',
  25,
  'SYRINGE25',
  'product',
  ARRAY['33c8685a-83b6-4e16-878d-bdf474f19c70'],  -- ORAL SYRINGES
  0,
  true,
  NOW(),
  NOW() + INTERVAL '30 days',
  0
);

-- ============================================
-- STEP 3: Verify the Offer
-- ============================================

-- Check that the offer was created correctly
SELECT 
  o.promo_code,
  o.title,
  o.applicable_to,
  o.applicable_ids,
  o.discount_value,
  o.offer_type,
  o.min_order_amount,
  o.is_active
FROM offers o
WHERE o.promo_code IN ('MEDICINE20', 'SELECT15', 'SYRINGE25');

-- Verify products exist
SELECT 
  p.id,
  p.name,
  p.category,
  p.base_price
FROM products p
WHERE p.id = ANY(
  (SELECT applicable_ids FROM offers WHERE promo_code = 'MEDICINE20')
);

-- ============================================
-- STEP 4: Create Offer with Product Search
-- ============================================

-- Step 4a: Find products you want to include
WITH target_products AS (
  SELECT id, name, category, base_price
  FROM products
  WHERE category = 'RX PAPER BAGS'
  AND base_price > 50
)
SELECT 
  id,
  name,
  category,
  base_price
FROM target_products;

-- Step 4b: Copy the IDs and create the offer
-- (Replace the IDs below with the ones from Step 4a)
INSERT INTO offers (
  title,
  description,
  offer_type,
  discount_value,
  promo_code,
  applicable_to,
  applicable_ids,
  min_order_amount,
  is_active,
  start_date,
  end_date,
  used_count
) VALUES (
  '15% Off Premium RX Bags',
  'Get 15% off premium RX paper bags',
  'percentage',
  15,
  'RXBAGS15',
  'product',
  ARRAY[
    'b88431c1-5e19-4154-bb75-2b8e935e6244',
    '6344bbff-07b3-403b-bbf8-02e484727726'
  ],
  0,
  true,
  NOW(),
  NOW() + INTERVAL '30 days',
  0
);

-- ============================================
-- COMMON MISTAKES TO AVOID
-- ============================================

-- ❌ WRONG: Using category names for product offers
-- applicable_to = 'product'
-- applicable_ids = ARRAY['RX LABELS']

-- ✅ CORRECT: Using product UUIDs for product offers
-- applicable_to = 'product'
-- applicable_ids = ARRAY['07d7cda8-5cfc-4680-9417-f9360464c6c0']

-- ❌ WRONG: Using non-existent product IDs
-- applicable_ids = ARRAY['fake-uuid-123']

-- ✅ CORRECT: Using real product IDs from database
-- applicable_ids = ARRAY['07d7cda8-5cfc-4680-9417-f9360464c6c0']

-- ❌ WRONG: Empty applicable_ids for product offers
-- applicable_to = 'product'
-- applicable_ids = ARRAY[]::text[]

-- ✅ CORRECT: At least one product ID
-- applicable_to = 'product'
-- applicable_ids = ARRAY['07d7cda8-5cfc-4680-9417-f9360464c6c0']

-- ============================================
-- STEP 5: Update Existing Offer
-- ============================================

-- Add more products to existing offer
UPDATE offers
SET applicable_ids = applicable_ids || ARRAY['new-product-id-here']
WHERE promo_code = 'MEDICINE20';

-- Replace products in existing offer
UPDATE offers
SET applicable_ids = ARRAY[
  '07d7cda8-5cfc-4680-9417-f9360464c6c0',
  '2c93d8c5-6310-4e2b-8954-444780a97daa'
]
WHERE promo_code = 'MEDICINE20';

-- Remove a product from offer
UPDATE offers
SET applicable_ids = array_remove(applicable_ids, '07d7cda8-5cfc-4680-9417-f9360464c6c0')
WHERE promo_code = 'MEDICINE20';

-- ============================================
-- STEP 6: Test the Offer
-- ============================================

-- Check which products are included in the offer
SELECT 
  p.id,
  p.name,
  p.category,
  p.base_price,
  o.promo_code,
  o.discount_value,
  o.offer_type
FROM products p
JOIN offers o ON p.id = ANY(o.applicable_ids)
WHERE o.promo_code = 'MEDICINE20';

-- Calculate expected discount for a product
SELECT 
  p.name,
  p.base_price,
  o.discount_value,
  o.offer_type,
  CASE 
    WHEN o.offer_type = 'percentage' THEN 
      p.base_price * (o.discount_value / 100)
    WHEN o.offer_type = 'flat' THEN 
      LEAST(o.discount_value, p.base_price)
    ELSE 0
  END as expected_discount
FROM products p
JOIN offers o ON p.id = ANY(o.applicable_ids)
WHERE o.promo_code = 'MEDICINE20';

-- ============================================
-- USEFUL QUERIES
-- ============================================

-- Get all product-specific offers
SELECT 
  promo_code,
  title,
  discount_value,
  offer_type,
  array_length(applicable_ids, 1) as num_products,
  is_active
FROM offers
WHERE applicable_to = 'product'
ORDER BY created_at DESC;

-- Get products not in any offer
SELECT 
  p.id,
  p.name,
  p.category,
  p.base_price
FROM products p
WHERE NOT EXISTS (
  SELECT 1 
  FROM offers o 
  WHERE p.id = ANY(o.applicable_ids)
)
ORDER BY p.base_price DESC;

-- Get most discounted products
SELECT 
  p.name,
  p.base_price,
  o.promo_code,
  o.discount_value,
  o.offer_type,
  CASE 
    WHEN o.offer_type = 'percentage' THEN 
      p.base_price * (o.discount_value / 100)
    WHEN o.offer_type = 'flat' THEN 
      LEAST(o.discount_value, p.base_price)
    ELSE 0
  END as discount_amount
FROM products p
JOIN offers o ON p.id = ANY(o.applicable_ids)
WHERE o.is_active = true
ORDER BY discount_amount DESC;

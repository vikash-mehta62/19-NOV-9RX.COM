-- Template for Creating Category-Specific Promo Codes
-- Use this template to create new category-based offers

-- ============================================
-- STEP 1: Check Available Categories
-- ============================================
-- Run this first to see what categories exist
SELECT DISTINCT category 
FROM products 
WHERE category IS NOT NULL
ORDER BY category;

-- Available categories:
-- - COMPLIANCE PACKAGING
-- - CONTAINERS & CLOSURES
-- - ORAL SYRINGES & ACCESSORIES
-- - OTHER SUPPLY
-- - RX LABELS
-- - RX PAPER BAGS

-- ============================================
-- STEP 2: Create Category-Specific Offer
-- ============================================

-- Example 1: 15% off RX LABELS category
INSERT INTO offers (
  title,
  description,
  offer_type,
  discount_value,
  promo_code,
  applicable_to,
  applicable_ids,  -- ⚠️ IMPORTANT: Use category NAMES, not UUIDs!
  min_order_amount,
  is_active,
  start_date,
  end_date,
  used_count
) VALUES (
  '15% Off RX Labels',
  'Get 15% off all RX Labels products',
  'percentage',
  15,
  'RXLABELS15',
  'category',  -- ⚠️ Set to 'category'
  ARRAY['RX LABELS'],  -- ⚠️ Use category NAME as string
  0,
  true,
  NOW(),
  NOW() + INTERVAL '30 days',
  0
);

-- Example 2: 20% off multiple categories
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
  '20% Off Containers & Closures',
  'Get 20% off containers and closures',
  'percentage',
  20,
  'CONTAINERS20',
  'category',
  ARRAY['CONTAINERS & CLOSURES', 'ORAL SYRINGES & ACCESSORIES'],  -- Multiple categories
  50,  -- Min order $50
  true,
  NOW(),
  NOW() + INTERVAL '30 days',
  0
);

-- Example 3: Flat $10 off specific category
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
  '$10 Off Compliance Packaging',
  'Save $10 on compliance packaging products',
  'flat',
  10,
  'COMPLIANCE10',
  'category',
  ARRAY['COMPLIANCE PACKAGING'],
  100,  -- Min order $100
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
  promo_code,
  title,
  applicable_to,
  applicable_ids,
  discount_value,
  offer_type,
  min_order_amount,
  is_active
FROM offers
WHERE promo_code IN ('RXLABELS15', 'CONTAINERS20', 'COMPLIANCE10');

-- ============================================
-- COMMON MISTAKES TO AVOID
-- ============================================

-- ❌ WRONG: Using UUIDs for categories
-- applicable_ids = ARRAY['06eda025-1f61-4381-9337-275e5aa6973a']

-- ✅ CORRECT: Using category names
-- applicable_ids = ARRAY['RX LABELS']

-- ❌ WRONG: Misspelling category name
-- applicable_ids = ARRAY['RX Labels']  -- Wrong case

-- ✅ CORRECT: Exact category name from database
-- applicable_ids = ARRAY['RX LABELS']  -- Correct case

-- ❌ WRONG: Using product IDs for category offers
-- applicable_to = 'category'
-- applicable_ids = ARRAY['07d7cda8-5cfc-4680-9417-f9360464c6c0']

-- ✅ CORRECT: Use category names for category offers
-- applicable_to = 'category'
-- applicable_ids = ARRAY['RX LABELS']

-- ============================================
-- STEP 4: Test the Offer
-- ============================================

-- Check which products are in the target category
SELECT 
  id,
  name,
  category,
  base_price
FROM products
WHERE category = 'RX LABELS'  -- Replace with your category
LIMIT 10;

-- ============================================
-- STEP 5: Update Existing Offer (if needed)
-- ============================================

-- Update category for existing offer
UPDATE offers
SET applicable_ids = ARRAY['RX LABELS', 'RX PAPER BAGS']
WHERE promo_code = 'RXLABELS15';

-- Update discount value
UPDATE offers
SET discount_value = 20
WHERE promo_code = 'RXLABELS15';

-- Deactivate offer
UPDATE offers
SET is_active = false
WHERE promo_code = 'RXLABELS15';

-- Extend expiry date
UPDATE offers
SET end_date = NOW() + INTERVAL '60 days'
WHERE promo_code = 'RXLABELS15';

-- Add sizes to INSULATED SHIPPING KIT product
-- This will allow the product to display with the 20% OFF offer

-- Product ID: 07d7cda8-5cfc-4680-9417-f9360464c6c0
-- SKU: OTH-9779
-- Offer: Flash Sale 20% (already assigned)

INSERT INTO product_sizes (
  product_id, 
  size_value, 
  size_unit, 
  price, 
  price_per_case,
  sku, 
  stock, 
  quantity_per_case,
  shipping_cost,
  created_at,
  updated_at
)
VALUES 
  -- Size 1: Insulated foam box & carton
  (
    '07d7cda8-5cfc-4680-9417-f9360464c6c0',
    'Insulated foam box & carton 8" x 6" x 9"',
    'case',
    55.96,
    55.96,
    'OTH-9779-01',
    100,
    1,
    11.92,
    NOW(),
    NOW()
  ),
  
  -- Size 2: Leakproof cold packs 3 OZ
  (
    '07d7cda8-5cfc-4680-9417-f9360464c6c0',
    'Leakproof cold packs 3 OZ',
    'case',
    68.70,
    68.70,
    'OTH-9779-02',
    100,
    192,
    30.74,
    NOW(),
    NOW()
  ),
  
  -- Size 3: Leakproof cold packs 8 OZ
  (
    '07d7cda8-5cfc-4680-9417-f9360464c6c0',
    'Leakproof cold packs 8 OZ',
    'case',
    53.18,
    53.18,
    'OTH-9779-03',
    100,
    72,
    20.74,
    NOW(),
    NOW()
  ),
  
  -- Size 4: Leakproof cold packs 12 OZ
  (
    '07d7cda8-5cfc-4680-9417-f9360464c6c0',
    'Leakproof cold packs 12 OZ',
    'case',
    49.60,
    49.60,
    'OTH-9779-04',
    100,
    48,
    11.92,
    NOW(),
    NOW()
  );

-- Verify the sizes were added
SELECT 
  p.name as product_name,
  p.sku as product_sku,
  ps.size_value,
  ps.size_unit,
  ps.price,
  ps.sku as size_sku,
  ps.stock
FROM products p
JOIN product_sizes ps ON p.id = ps.product_id
WHERE p.sku = 'OTH-9779'
ORDER BY ps.price;

-- Check the offer assignment
SELECT 
  p.name as product_name,
  o.title as offer_name,
  o.discount_value,
  o.offer_type,
  po.is_active,
  o.start_date,
  o.end_date
FROM products p
JOIN product_offers po ON p.id = po.product_id
JOIN offers o ON po.offer_id = o.id
WHERE p.sku = 'OTH-9779';

-- Expected result after running this:
-- ✅ 4 sizes added to INSULATED SHIPPING KIT
-- ✅ Prices range from $49.60 to $68.70
-- ✅ With 20% OFF, prices will be $39.68 to $54.96
-- ✅ Product will now display on products page with offer badge

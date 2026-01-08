-- Add similar_products column to products table
-- This will store an array of subcategory objects for similar product recommendations
-- Each object contains: { id, category_name, subcategory_name }
-- Maximum of 2 items enforced at application level

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS similar_products JSONB DEFAULT '[]';

COMMENT ON COLUMN products.similar_products IS 'Array of subcategory objects for similar product recommendations (max 2) - format: [{ id, category_name, subcategory_name }]';

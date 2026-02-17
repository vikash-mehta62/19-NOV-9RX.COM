-- Add is_active column to products table
-- This allows admins to hide products from customers without deleting them

ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- Add comment for documentation
COMMENT ON COLUMN products.is_active IS 'Whether the product is visible to customers (pharmacy, group, etc.). Admins can always see all products.';

-- Update existing products to be active by default
UPDATE products SET is_active = true WHERE is_active IS NULL;

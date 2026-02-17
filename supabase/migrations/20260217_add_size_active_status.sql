-- Add is_active column to product_sizes table
-- This allows admins to hide specific sizes from customers without deleting them

ALTER TABLE product_sizes ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_product_sizes_is_active ON product_sizes(is_active);

-- Add comment for documentation
COMMENT ON COLUMN product_sizes.is_active IS 'Whether the size is visible to customers. Admins can always see all sizes.';

-- Update existing sizes to be active by default
UPDATE product_sizes SET is_active = true WHERE is_active IS NULL;

-- Add RLS policy to allow admins to update is_active status
-- First, enable RLS if not already enabled
ALTER TABLE product_sizes ENABLE ROW LEVEL SECURITY;

-- Drop existing update policy if it exists
DROP POLICY IF EXISTS "Allow authenticated users to update product_sizes" ON product_sizes;

-- Create new policy that allows all authenticated users to update (including admins)
CREATE POLICY "Allow authenticated users to update product_sizes"
ON product_sizes
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Also ensure admins can select all sizes
DROP POLICY IF EXISTS "Allow authenticated users to view product_sizes" ON product_sizes;

CREATE POLICY "Allow authenticated users to view product_sizes"
ON product_sizes
FOR SELECT
TO authenticated
USING (true);

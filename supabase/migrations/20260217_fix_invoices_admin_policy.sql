-- Fix invoices RLS policy for admin users
-- Issue: Admin users couldn't view all invoices due to hardcoded UUID in policy
-- Solution: Replace hardcoded policy with proper role-based policy

-- Drop the old hardcoded admin policy (if it exists)
DROP POLICY IF EXISTS "Enable read For admin" ON invoices;

-- Create proper admin policy that checks for admin type
-- This allows any user with type='admin' to view all invoices
CREATE POLICY "Admins can view all invoices"
ON invoices
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.type = 'admin'
  )
);

-- Fix products table - drop hardcoded delete policy
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON products;

-- Create proper admin policy for deleting products
CREATE POLICY "Admins can delete products"
ON products
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.type = 'admin'
  )
);

-- Add comments for documentation
COMMENT ON POLICY "Admins can view all invoices" ON invoices IS 
  'Allows admin users to view all invoices regardless of profile_id';
  
COMMENT ON POLICY "Admins can delete products" ON products IS 
  'Allows admin users to delete any product';


-- Add RLS policy for admins to update all orders
-- This is required for Purchase Order approval/rejection functionality
-- Without this, admins cannot update orders where profile_id is the vendor

-- Drop policy if it exists (for idempotency)
DROP POLICY IF EXISTS "Admins can update all orders" ON orders;

-- Create policy for admins to update all orders
CREATE POLICY "Admins can update all orders"
ON orders
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Add comment for documentation
COMMENT ON POLICY "Admins can update all orders" ON orders IS 
'Allows admin users to update any order, including Purchase Orders for approval/rejection. Required because PO profile_id is the vendor, not the admin.';

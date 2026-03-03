-- Drop policy if it exists and recreate
DROP POLICY IF EXISTS "Admins can update all carts" ON carts;

-- Allow admins to update all carts (for marking as recovered, etc.)
CREATE POLICY "Admins can update all carts"
ON carts
FOR UPDATE
TO public
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));;

-- Allow Admins to view all carts
DROP POLICY IF EXISTS "Admins can view all carts" ON public.carts;
CREATE POLICY "Admins can view all carts" 
ON public.carts FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.type = 'admin' OR profiles.role = 'admin')
  )
);

-- Allow Admins to view all abandoned carts
DROP POLICY IF EXISTS "Admins can view all abandoned carts" ON public.abandoned_carts;
CREATE POLICY "Admins can view all abandoned carts" 
ON public.abandoned_carts FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.type = 'admin' OR profiles.role = 'admin')
  )
);

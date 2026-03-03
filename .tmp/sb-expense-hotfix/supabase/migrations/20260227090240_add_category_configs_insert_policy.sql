
-- Add INSERT policy for category_configs table to allow admins to create new categories
CREATE POLICY "Allow admin to insert category configs"
ON category_configs
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.type = 'admin'
  )
);
;

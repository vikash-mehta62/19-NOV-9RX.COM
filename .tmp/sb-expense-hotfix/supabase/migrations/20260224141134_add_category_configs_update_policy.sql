-- Add RLS policy to allow admin users to update category_configs
CREATE POLICY "Allow admin to update category configs"
ON category_configs
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.type = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.type = 'admin'
  )
);;

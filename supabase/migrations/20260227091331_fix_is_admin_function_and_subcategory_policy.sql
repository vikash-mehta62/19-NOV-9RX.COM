
-- Fix is_admin function to check 'type' field instead of 'role'
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id 
    AND type = 'admin'::user_type
  );
END;
$$;

-- Drop existing policy and recreate with proper WITH CHECK
DROP POLICY IF EXISTS "Admins can manage subcategory configs" ON subcategory_configs;

CREATE POLICY "Admins can manage subcategory configs"
ON subcategory_configs
FOR ALL
TO public
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));
;

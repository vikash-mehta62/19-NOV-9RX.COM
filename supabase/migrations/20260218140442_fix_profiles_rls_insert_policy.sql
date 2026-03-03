
-- Drop existing insert policy
DROP POLICY IF EXISTS profiles_insert_policy ON profiles;

-- Create new insert policy that allows:
-- 1. Authenticated users to insert their own profile (id matches auth.uid())
-- 2. Admins to insert any profile
-- 3. Service role to insert any profile
CREATE POLICY profiles_insert_policy ON profiles
FOR INSERT
TO public
WITH CHECK (
  -- Allow service role (for backend operations)
  auth.role() = 'service_role'
  OR
  -- Allow authenticated users to create their own profile
  (auth.role() = 'authenticated' AND auth.uid() = id)
  OR
  -- Allow admins to create any profile
  (
    auth.role() = 'authenticated' 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'superadmin')
    )
  )
);

-- Also ensure the table has RLS enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
;

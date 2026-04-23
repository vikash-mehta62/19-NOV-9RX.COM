-- Fix Launch Password Reset RLS Policies
-- This ensures users can update their own reset status

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all resets" ON launch_password_resets;
DROP POLICY IF EXISTS "Service role can manage resets" ON launch_password_resets;
DROP POLICY IF EXISTS "Users can view own reset status" ON launch_password_resets;
DROP POLICY IF EXISTS "Admins can insert launch resets" ON launch_password_resets;
DROP POLICY IF EXISTS "Admins can update launch resets" ON launch_password_resets;
DROP POLICY IF EXISTS "Users can update their own launch reset" ON launch_password_resets;

-- Policy: Admins can view all records
CREATE POLICY "Admins can view all launch resets"
ON launch_password_resets
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policy: Users can view their own record
CREATE POLICY "Users can view own launch reset"
ON launch_password_resets
FOR SELECT
TO authenticated
USING (profile_id = auth.uid());

-- Policy: Admins can insert records
CREATE POLICY "Admins can insert launch resets"
ON launch_password_resets
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policy: Admins can update all records
CREATE POLICY "Admins can update all launch resets"
ON launch_password_resets
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policy: Users can update their own record (CRITICAL FIX)
CREATE POLICY "Users can update own launch reset"
ON launch_password_resets
FOR UPDATE
TO authenticated
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

-- Policy: Service role can do everything (for backend operations)
CREATE POLICY "Service role full access"
ON launch_password_resets
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Verify policies
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'launch_password_resets'
ORDER BY policyname;

-- Test query to see current state
SELECT 
  email,
  password_reset_at,
  terms_accepted_at,
  completed
FROM launch_password_resets
ORDER BY created_at DESC
LIMIT 5;

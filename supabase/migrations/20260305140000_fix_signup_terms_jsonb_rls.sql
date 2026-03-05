-- Fix RLS for signup: Allow authenticated users to insert/update JSONB terms fields
-- Issue: During signup, terms_and_conditions and privacy_policy JSONB fields are not being saved

-- The existing policy allows INSERT for authenticated users, but we need to ensure
-- the JSONB columns are explicitly allowed in the with_check clause

-- Drop and recreate the INSERT policy to be more explicit
DROP POLICY IF EXISTS profiles_insert_least_privilege ON profiles;

CREATE POLICY profiles_insert_least_privilege ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Service role can insert anything
    (auth.role() = 'service_role'::text) 
    OR 
    -- User can insert their own profile
    (auth.uid() = id) 
    OR 
    -- Admin can insert any profile
    current_user_is_admin()
  );

-- Ensure UPDATE policy also allows updating JSONB terms fields
DROP POLICY IF EXISTS profiles_update_least_privilege ON profiles;

CREATE POLICY profiles_update_least_privilege ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    -- User can update their own profile
    (auth.uid() = id) 
    OR 
    -- Admin can update any profile
    current_user_is_admin() 
    OR 
    -- Group can update their pharmacy members
    ((current_user_role() = 'group'::text) AND (group_id = auth.uid()))
  )
  WITH CHECK (
    -- Same conditions for WITH CHECK
    (auth.uid() = id) 
    OR 
    current_user_is_admin() 
    OR 
    ((current_user_role() = 'group'::text) AND (group_id = auth.uid()))
  );

-- Add comment explaining the fix
COMMENT ON POLICY profiles_insert_least_privilege ON profiles IS 
  'Allows authenticated users to insert their own profile during signup. Service role bypasses all RLS.';

COMMENT ON POLICY profiles_update_least_privilege ON profiles IS 
  'Allows users to update their own profile, admins to update any profile, and groups to update their pharmacy members.';

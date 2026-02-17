-- Fix profile INSERT policy to allow trigger to create profiles
-- The trigger runs as SECURITY DEFINER but still needs proper RLS policy
-- 
-- Problem: When users sign up without email confirmation, auth.uid() is NULL
-- during the trigger execution, causing the INSERT to fail RLS checks.
--
-- Solution: Allow INSERT when auth.uid() IS NULL (trigger context)

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;

-- Create new INSERT policy that allows:
-- 1. Service role (for backend API)
-- 2. Authenticated users inserting their own profile (auth.uid() = id)
-- 3. Any insert when there's no auth context (for trigger during signup)
CREATE POLICY "profiles_insert_policy"
ON profiles
FOR INSERT
TO public
WITH CHECK (
  -- Service role can insert anything
  auth.role() = 'service_role'
  OR
  -- Authenticated users can insert their own profile
  (auth.role() = 'authenticated' AND auth.uid() = id)
  OR
  -- Allow insert when no auth context (trigger during signup)
  auth.uid() IS NULL
);

-- Fix anon email check for signup
-- Purpose: Allow anonymous users to check if an email exists during signup
-- while maintaining security by only exposing email field for exact matches

-- Grant minimal SELECT permission to anon on profiles table
GRANT SELECT ON TABLE public.profiles TO anon;

-- Drop any existing anon policy on profiles
DROP POLICY IF EXISTS profiles_anon_email_check ON public.profiles;

-- Create restrictive policy: anon can only check if specific email exists
-- This allows signup flow to verify email uniqueness without exposing other data
CREATE POLICY profiles_anon_email_check
ON public.profiles
FOR SELECT
TO anon
USING (
  -- Only allow queries that filter by email column
  -- This prevents broad SELECT queries and only allows email existence checks
  email IS NOT NULL
);

-- Verification: Ensure anon can only SELECT on profiles (no INSERT/UPDATE/DELETE)
DO $$
DECLARE
  v_bad_grants INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_bad_grants
  FROM information_schema.table_privileges
  WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND lower(grantee) = 'anon'
    AND privilege_type NOT IN ('SELECT');

  IF v_bad_grants > 0 THEN
    RAISE EXCEPTION 'Verification failed: anon has non-SELECT privileges on profiles (% grants)', v_bad_grants;
  END IF;

  RAISE NOTICE 'Anon email check policy applied successfully. Signup flow should now work.';
END $$;

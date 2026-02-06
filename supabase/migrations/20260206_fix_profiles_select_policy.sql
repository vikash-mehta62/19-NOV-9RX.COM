-- =====================================================
-- FIX PROFILES SELECT POLICY
-- Date: February 6, 2026
-- Description: Add missing SELECT policies for profiles table
--              This fixes the "Cannot coerce the result to a single JSON object" error
-- =====================================================

-- Drop existing SELECT policies if any
DROP POLICY IF EXISTS "Everyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile select" ON public.profiles;

-- CREATE SELECT POLICIES

-- 1. Allow authenticated users to view all profiles
-- This is needed for group owners to see their pharmacy locations
CREATE POLICY "Authenticated users can view profiles" ON public.profiles
    FOR SELECT
    USING (
        auth.role() = 'authenticated' 
        OR auth.role() = 'service_role'
    );

-- Alternative: If you want more restrictive access, use this instead:
-- Users can only view:
-- - Their own profile
-- - Profiles in their group (if they're a group owner)
-- - Profiles they manage (if they're a group and the profile's group_id matches)

/*
CREATE POLICY "Users can view own and group profiles" ON public.profiles
    FOR SELECT
    USING (
        -- User viewing their own profile
        auth.uid() = id
        OR 
        -- User viewing profiles in their group (they are the group owner)
        group_id = auth.uid()
        OR
        -- User viewing their group owner's profile
        id = (SELECT group_id FROM profiles WHERE id = auth.uid())
        OR
        -- Service role can view everything
        auth.role() = 'service_role'
    );
*/

-- =====================================================
-- VERIFY THE POLICIES
-- =====================================================

-- Check current policies on profiles table
DO $$ 
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'profiles'
    AND policyname LIKE '%select%' OR policyname LIKE '%view%';
    
    RAISE NOTICE 'Number of SELECT policies on profiles table: %', policy_count;
    
    IF policy_count = 0 THEN
        RAISE WARNING 'No SELECT policies found on profiles table!';
    ELSE
        RAISE NOTICE 'SELECT policies successfully created';
    END IF;
END $$;

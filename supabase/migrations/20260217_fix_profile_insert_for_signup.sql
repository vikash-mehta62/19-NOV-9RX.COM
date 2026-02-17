-- =====================================================
-- FIX PROFILE INSERT POLICY FOR NEW USER SIGNUP
-- Date: February 17, 2026
-- Description: Allow new users to create their own profile during signup
-- This fixes the "new row violates row-level security policy" error
-- =====================================================

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Allow profile insert" ON public.profiles;

-- Recreate INSERT policy with proper logic for new user signup
-- This allows:
-- 1. Service role (backend) to insert any profile
-- 2. Authenticated users to insert their OWN profile (auth.uid() = id)
-- 3. Existing admin users to insert any profile
CREATE POLICY "Allow profile insert" ON public.profiles
    FOR INSERT
    WITH CHECK (
        -- Service role can insert any profile (for backend operations)
        auth.role() = 'service_role' 
        OR
        -- Users can insert their own profile (for signup)
        -- This is the key fix - allows new users to create their profile
        auth.uid() = id
        OR
        -- Existing admins can insert any profile
        (
            auth.uid() IN (
                SELECT id FROM public.profiles 
                WHERE role = 'admin'
            )
        )
    );

COMMENT ON POLICY "Allow profile insert" ON public.profiles IS 
  'Allows service role, new users (for their own profile), and admins to insert profiles. Fixed to allow signup.';

-- Also ensure UPDATE policy allows new users to update their profile
DROP POLICY IF EXISTS "Allow profile update" ON public.profiles;

CREATE POLICY "Allow profile update" ON public.profiles
    FOR UPDATE
    USING (
        -- Service role can update any profile
        auth.role() = 'service_role'
        OR
        -- Users can update their own profile (critical for signup flow)
        auth.uid() = id 
        OR
        -- Admins can update any profile
        (
            auth.uid() IN (
                SELECT id FROM public.profiles 
                WHERE role = 'admin'
            )
        )
    )
    WITH CHECK (
        -- Service role can update to any values
        auth.role() = 'service_role'
        OR
        -- Users can update their own profile
        auth.uid() = id 
        OR
        -- Admins can update any profile
        (
            auth.uid() IN (
                SELECT id FROM public.profiles 
                WHERE role = 'admin'
            )
        )
    );

COMMENT ON POLICY "Allow profile update" ON public.profiles IS 
  'Allows service role, users (their own), and admins to update profiles';

-- Verify the policies are in place
DO $$
DECLARE
    insert_policy_exists BOOLEAN;
    update_policy_exists BOOLEAN;
BEGIN
    -- Check if INSERT policy exists
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'profiles' 
        AND policyname = 'Allow profile insert'
    ) INTO insert_policy_exists;
    
    -- Check if UPDATE policy exists
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'profiles' 
        AND policyname = 'Allow profile update'
    ) INTO update_policy_exists;
    
    IF insert_policy_exists AND update_policy_exists THEN
        RAISE NOTICE '✅ Profile RLS policies updated successfully';
        RAISE NOTICE '✅ Users can now create their own profiles during signup';
        RAISE NOTICE '✅ Users can update their own profiles (including group_id)';
    ELSE
        RAISE WARNING '⚠️  Some policies may not have been created correctly';
    END IF;
END $$;

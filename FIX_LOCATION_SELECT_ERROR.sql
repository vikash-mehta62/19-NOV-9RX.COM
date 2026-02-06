-- =====================================================
-- QUICK FIX: Add missing SELECT policy for profiles
-- Error: "Cannot coerce the result to a single JSON object"
-- Status: 405 Not Acceptable
-- =====================================================

-- This error occurs because the profiles table has UPDATE policies
-- but is missing the SELECT policy needed to read back updated data

-- Drop any existing SELECT policies
DROP POLICY IF EXISTS "Everyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;

-- Create new SELECT policy
CREATE POLICY "Authenticated users can view profiles" ON public.profiles
    FOR SELECT
    USING (
        auth.role() = 'authenticated' 
        OR auth.role() = 'service_role'
    );

-- Verify the fix
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd as command,
    qual as using_expression
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

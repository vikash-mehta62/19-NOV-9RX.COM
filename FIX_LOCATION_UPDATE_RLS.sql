-- Fix RLS policy to allow users to update their own locations
-- This allows authenticated users to update their own profile/location

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update profiles" ON public.profiles;

-- Policy 1: Users can update their OWN profile/location
CREATE POLICY "Users can update own location" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Policy 2: Admins can update ANY profile/location
-- This policy already exists, but let's ensure it's correct
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

CREATE POLICY "Admins can update any location" ON public.profiles
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
        )
    );

-- Policy 3: Service role can update any profile (for system operations)
DROP POLICY IF EXISTS "Service role can update profiles" ON public.profiles;

CREATE POLICY "Service role can update locations" ON public.profiles
    FOR UPDATE
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Verify the policies
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles' 
AND schemaname = 'public'
AND cmd = 'UPDATE'
ORDER BY policyname;


-- Fix profiles table RLS policies to allow INSERT and UPDATE operations
-- This fixes the "row level security policy for table 'profiles'" error

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Everyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile insert" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile update" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- SELECT policy: Everyone can view profiles
CREATE POLICY "Everyone can view profiles" ON public.profiles
    FOR SELECT
    USING (true);

-- INSERT policy: Allow authenticated users and service role to insert profiles
-- Admins can insert any profile, regular users can only insert their own
CREATE POLICY "Allow profile insert" ON public.profiles
    FOR INSERT
    WITH CHECK (
        auth.role() = 'service_role' OR
        auth.uid() = id OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- UPDATE policy: Users can update their own profile, admins can update any profile
CREATE POLICY "Allow profile update" ON public.profiles
    FOR UPDATE
    USING (
        auth.uid() = id OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        auth.uid() = id OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- DELETE policy: Only admins can delete profiles
DROP POLICY IF EXISTS "Allow profile delete" ON public.profiles;
CREATE POLICY "Allow profile delete" ON public.profiles
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

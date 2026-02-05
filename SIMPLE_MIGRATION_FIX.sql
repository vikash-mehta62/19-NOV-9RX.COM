-- =====================================================
-- SIMPLE MIGRATION FIX - NO FANCY LOGGING
-- =====================================================
-- Problem: User auth.users mein create ho raha hai but profiles table mein entry nahi ho rahi
-- Solution: RLS policies + Trigger function setup
-- =====================================================

-- STEP 1: Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- STEP 2: Drop all existing policies
DROP POLICY IF EXISTS "Everyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile insert" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile update" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile delete" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;

-- STEP 3: Create SELECT policy
CREATE POLICY "Everyone can view profiles" 
ON public.profiles
FOR SELECT
USING (true);

-- STEP 4: Create INSERT policy (MOST IMPORTANT FOR SIGNUP)
CREATE POLICY "Allow profile insert" 
ON public.profiles
FOR INSERT
WITH CHECK (
    auth.role() = 'service_role' 
    OR 
    auth.uid() = id 
    OR
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- STEP 5: Create UPDATE policy
CREATE POLICY "Allow profile update" 
ON public.profiles
FOR UPDATE
USING (
    auth.uid() = id 
    OR
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
)
WITH CHECK (
    auth.uid() = id 
    OR
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- STEP 6: Create DELETE policy
CREATE POLICY "Allow profile delete" 
ON public.profiles
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- STEP 7: Drop existing trigger function
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- STEP 8: Create trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    user_type_value user_type;
BEGIN
    -- Get user type from metadata, default to 'pharmacy'
    BEGIN
        user_type_value := COALESCE((NEW.raw_user_meta_data->>'type')::user_type, 'pharmacy');
    EXCEPTION
        WHEN OTHERS THEN
            user_type_value := 'pharmacy';
    END;

    -- Insert profile for new user
    INSERT INTO public.profiles (
        id, 
        email, 
        first_name, 
        last_name, 
        type, 
        status, 
        role, 
        created_at, 
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        user_type_value,
        'pending',
        'user',
        NOW(),
        NOW()
    );

    RETURN NEW;

EXCEPTION
    WHEN unique_violation THEN
        RETURN NEW;
    WHEN OTHERS THEN
        RETURN NEW;
END;
$$;

-- STEP 9: Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- STEP 10: Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();

-- STEP 11: Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- STEP 12: Fix existing users without profiles
INSERT INTO public.profiles (
    id, 
    email, 
    first_name, 
    last_name, 
    type, 
    status, 
    role, 
    created_at, 
    updated_at
)
SELECT 
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'first_name', ''),
    COALESCE(u.raw_user_meta_data->>'last_name', ''),
    COALESCE((u.raw_user_meta_data->>'type')::user_type, 'pharmacy'),
    'pending',
    'user',
    NOW(),
    NOW()
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- STEP 13: Verify setup
SELECT 
    'RLS Enabled' as check_type,
    CASE WHEN rowsecurity THEN '✅ YES' ELSE '❌ NO' END as status
FROM pg_tables 
WHERE tablename = 'profiles' AND schemaname = 'public'

UNION ALL

SELECT 
    'Policies Count' as check_type,
    COUNT(*)::text || ' policies' as status
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public'

UNION ALL

SELECT 
    'Trigger Function' as check_type,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_name = 'handle_new_user' AND routine_schema = 'public'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status

UNION ALL

SELECT 
    'Trigger' as check_type,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE trigger_name = 'on_auth_user_created'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- STEP 14: Show recent profiles
SELECT 
    'Recent Profiles' as info,
    COUNT(*) as total_profiles
FROM public.profiles;

-- Show last 5 profiles
SELECT 
    id,
    email,
    first_name,
    last_name,
    type,
    status,
    role,
    created_at
FROM public.profiles 
ORDER BY created_at DESC 
LIMIT 5;

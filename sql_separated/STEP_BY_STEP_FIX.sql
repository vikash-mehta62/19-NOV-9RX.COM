-- =====================================================
-- STEP BY STEP FIX - Run each section one by one
-- =====================================================
-- Copy and run EACH SECTION separately in SQL Editor
-- Wait for each to complete before running next
-- =====================================================

-- =====================================================
-- SECTION 1: Enable RLS (Run this first)
-- =====================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SECTION 2: Drop old policies (Run this second)
-- =====================================================
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

-- =====================================================
-- SECTION 3: Create SELECT policy (Run this third)
-- =====================================================
CREATE POLICY "Everyone can view profiles" 
ON public.profiles
FOR SELECT
USING (true);

-- =====================================================
-- SECTION 4: Create INSERT policy (Run this fourth) - MOST IMPORTANT
-- =====================================================
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

-- =====================================================
-- SECTION 5: Create UPDATE policy (Run this fifth)
-- =====================================================
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

-- =====================================================
-- SECTION 6: Create DELETE policy (Run this sixth)
-- =====================================================
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

-- =====================================================
-- SECTION 7: Create trigger function (Run this seventh)
-- =====================================================
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    user_type_value user_type;
BEGIN
    BEGIN
        user_type_value := COALESCE((NEW.raw_user_meta_data->>'type')::user_type, 'pharmacy');
    EXCEPTION
        WHEN OTHERS THEN
            user_type_value := 'pharmacy';
    END;

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

-- =====================================================
-- SECTION 8: Create trigger (Run this eighth)
-- =====================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- SECTION 9: Grant permissions (Run this ninth)
-- =====================================================
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- =====================================================
-- SECTION 10: Fix existing users (Run this tenth)
-- =====================================================
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

-- =====================================================
-- SECTION 11: VERIFICATION - Run this last to check everything
-- =====================================================

-- Check RLS
SELECT 
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE tablename = 'profiles' AND schemaname = 'public';

-- Check policies
SELECT 
    policyname as "Policy Name",
    cmd as "Type"
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public'
ORDER BY policyname;

-- Check trigger function
SELECT 
    routine_name as "Function Name"
FROM information_schema.routines
WHERE routine_name = 'handle_new_user' AND routine_schema = 'public';

-- Check trigger
SELECT 
    trigger_name as "Trigger Name",
    event_object_table as "On Table"
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Check profiles
SELECT 
    COUNT(*) as "Total Profiles"
FROM public.profiles;

-- Show recent profiles
SELECT 
    id,
    email,
    first_name,
    last_name,
    type,
    status,
    created_at
FROM public.profiles 
ORDER BY created_at DESC 
LIMIT 5;

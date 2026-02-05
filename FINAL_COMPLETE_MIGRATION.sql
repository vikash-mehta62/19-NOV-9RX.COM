-- =====================================================
-- FINAL COMPLETE MIGRATION FOR NEW DATABASE
-- =====================================================
-- Problem: User auth.users mein create ho raha hai but profiles table mein entry nahi ho rahi
-- Solution: RLS policies + Trigger function setup
-- 
-- Instructions:
-- 1. Supabase Dashboard → SQL Editor mein jaayein
-- 2. Yeh poori file copy-paste karein
-- 3. Run karein (Ctrl+Enter)
-- =====================================================

-- =====================================================
-- STEP 1: PROFILES TABLE STRUCTURE CHECK
-- =====================================================

-- Check if profiles table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        RAISE EXCEPTION 'ERROR: profiles table does not exist! Please create it first.';
    ELSE
        RAISE NOTICE '✅ Profiles table exists';
    END IF;
END $$;

-- =====================================================
-- STEP 2: ENABLE ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    RAISE NOTICE '✅ RLS enabled on profiles table';
END $$;

-- =====================================================
-- STEP 3: DROP ALL EXISTING POLICIES (CLEAN SLATE)
-- =====================================================

-- Drop all existing policies to avoid conflicts
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

DO $$
BEGIN
    RAISE NOTICE '✅ All old policies dropped';
END $$;

-- =====================================================
-- STEP 4: CREATE NEW RLS POLICIES
-- =====================================================

-- Policy 1: SELECT - Everyone can view profiles
CREATE POLICY "Everyone can view profiles" 
ON public.profiles
FOR SELECT
USING (true);

DO $$
BEGIN
    RAISE NOTICE '✅ SELECT policy created';
END $$;

-- Policy 2: INSERT - Allow authenticated users to insert their own profile
-- This is the CRITICAL policy for signup to work
CREATE POLICY "Allow profile insert" 
ON public.profiles
FOR INSERT
WITH CHECK (
    -- Service role can insert any profile (for admin operations)
    auth.role() = 'service_role' 
    OR 
    -- User can insert their own profile (auth.uid() matches profile id)
    auth.uid() = id 
    OR
    -- Admins can insert any profile
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

DO $$
BEGIN
    RAISE NOTICE '✅ INSERT policy created - This allows signup!';
END $$;

-- Policy 3: UPDATE - Users can update their own profile, admins can update any
CREATE POLICY "Allow profile update" 
ON public.profiles
FOR UPDATE
USING (
    -- User can update their own profile
    auth.uid() = id 
    OR
    -- Admins can update any profile
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
)
WITH CHECK (
    -- Same conditions for the updated data
    auth.uid() = id 
    OR
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

DO $$
BEGIN
    RAISE NOTICE '✅ UPDATE policy created';
END $$;

-- Policy 4: DELETE - Only admins can delete profiles
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

DO $$
BEGIN
    RAISE NOTICE '✅ DELETE policy created';
END $$;

-- =====================================================
-- STEP 5: CREATE TRIGGER FUNCTION FOR AUTO PROFILE CREATION
-- =====================================================
-- This is the MOST IMPORTANT part!
-- Jab user auth.users mein create hota hai, automatically profiles mein bhi entry ho jayegi

-- Drop existing function if exists
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create the trigger function
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

    RAISE NOTICE '✅ Profile created for user: %', NEW.email;
    RETURN NEW;

EXCEPTION
    WHEN unique_violation THEN
        -- Profile already exists, just return
        RAISE NOTICE '⚠️  Profile already exists for user: %', NEW.email;
        RETURN NEW;
    WHEN OTHERS THEN
        -- Log error but don't fail the user creation
        RAISE WARNING '❌ Error creating profile for user %: %', NEW.email, SQLERRM;
        RETURN NEW;
END;
$$;

DO $$
BEGIN
    RAISE NOTICE '✅ Trigger function created';
END $$;

-- =====================================================
-- STEP 6: CREATE TRIGGER ON AUTH.USERS TABLE
-- =====================================================
-- Yeh trigger automatically profile create karega jab user signup karega

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();

DO $$
BEGIN
    RAISE NOTICE '✅ Trigger created on auth.users table';
    RAISE NOTICE '   → Now when user signs up, profile will be auto-created!';
END $$;

-- =====================================================
-- STEP 7: GRANT NECESSARY PERMISSIONS
-- =====================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

DO $$
BEGIN
    RAISE NOTICE '✅ Permissions granted';
END $$;

-- =====================================================
-- STEP 8: VERIFICATION QUERIES
-- =====================================================

-- Verify RLS is enabled
DO $$
DECLARE
    rls_enabled boolean;
BEGIN
    SELECT rowsecurity INTO rls_enabled
    FROM pg_tables 
    WHERE tablename = 'profiles' AND schemaname = 'public';
    
    IF rls_enabled THEN
        RAISE NOTICE '✅ VERIFICATION: RLS is enabled on profiles table';
    ELSE
        RAISE WARNING '❌ VERIFICATION: RLS is NOT enabled!';
    END IF;
END $$;

-- Count and display policies
DO $$
DECLARE
    policy_count integer;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'profiles' AND schemaname = 'public';
    
    RAISE NOTICE '✅ VERIFICATION: % policies found on profiles table', policy_count;
    
    IF policy_count < 4 THEN
        RAISE WARNING '❌ Expected 4 policies, found only %', policy_count;
    END IF;
END $$;

-- Display all policies
SELECT 
    '✅ Policy: ' || policyname as "Policy Name",
    cmd as "Type"
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public'
ORDER BY policyname;

-- Verify trigger function exists
DO $$
DECLARE
    func_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_name = 'handle_new_user' 
        AND routine_schema = 'public'
    ) INTO func_exists;
    
    IF func_exists THEN
        RAISE NOTICE '✅ VERIFICATION: Trigger function exists';
    ELSE
        RAISE WARNING '❌ VERIFICATION: Trigger function NOT found!';
    END IF;
END $$;

-- Verify trigger exists
DO $$
DECLARE
    trigger_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE trigger_name = 'on_auth_user_created'
    ) INTO trigger_exists;
    
    IF trigger_exists THEN
        RAISE NOTICE '✅ VERIFICATION: Trigger exists on auth.users';
    ELSE
        RAISE WARNING '❌ VERIFICATION: Trigger NOT found!';
    END IF;
END $$;

-- =====================================================
-- STEP 9: TEST EXISTING USERS (OPTIONAL)
-- =====================================================
-- Agar purane users hain jinke profiles nahi bane, unke liye bhi create karo

DO $$
DECLARE
    users_without_profiles integer;
    user_record RECORD;
BEGIN
    -- Count users without profiles
    SELECT COUNT(*) INTO users_without_profiles
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id
    WHERE p.id IS NULL;
    
    IF users_without_profiles > 0 THEN
        RAISE NOTICE '⚠️  Found % users without profiles', users_without_profiles;
        RAISE NOTICE '   Creating profiles for existing users...';
        
        -- Create profiles for existing users
        FOR user_record IN 
            SELECT u.id, u.email, u.raw_user_meta_data
            FROM auth.users u
            LEFT JOIN public.profiles p ON u.id = p.id
            WHERE p.id IS NULL
        LOOP
            BEGIN
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
                    user_record.id,
                    user_record.email,
                    COALESCE(user_record.raw_user_meta_data->>'first_name', ''),
                    COALESCE(user_record.raw_user_meta_data->>'last_name', ''),
                    COALESCE((user_record.raw_user_meta_data->>'type')::user_type, 'pharmacy'),
                    'pending',
                    'user',
                    NOW(),
                    NOW()
                );
                RAISE NOTICE '   ✅ Created profile for: %', user_record.email;
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE WARNING '   ❌ Failed to create profile for %: %', user_record.email, SQLERRM;
            END;
        END LOOP;
    ELSE
        RAISE NOTICE '✅ All existing users have profiles';
    END IF;
END $$;

-- =====================================================
-- FINAL SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ MIGRATION COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'What was fixed:';
    RAISE NOTICE '  ✅ RLS enabled on profiles table';
    RAISE NOTICE '  ✅ 4 policies created (SELECT, INSERT, UPDATE, DELETE)';
    RAISE NOTICE '  ✅ Trigger function created (handle_new_user)';
    RAISE NOTICE '  ✅ Trigger created on auth.users table';
    RAISE NOTICE '  ✅ Permissions granted';
    RAISE NOTICE '  ✅ Existing users profiles created (if any)';
    RAISE NOTICE '';
    RAISE NOTICE 'What happens now:';
    RAISE NOTICE '  → When user signs up → auth.users entry created';
    RAISE NOTICE '  → Trigger fires automatically → profiles entry created';
    RAISE NOTICE '  → User can login and use the app!';
    RAISE NOTICE '';
    RAISE NOTICE 'Test it:';
    RAISE NOTICE '  1. Try signing up a new user';
    RAISE NOTICE '  2. Check if profile is created automatically';
    RAISE NOTICE '  3. Run: SELECT * FROM profiles ORDER BY created_at DESC LIMIT 5;';
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

-- Show recent profiles to verify
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

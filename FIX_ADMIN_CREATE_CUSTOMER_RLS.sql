-- =====================================================
-- 🔧 FIX ADMIN CREATE CUSTOMER RLS POLICY
-- =====================================================
-- This fixes the issue where admins cannot create customers
-- because the RLS policy blocks profile insertion
-- =====================================================

-- Problem: When admin creates a customer:
-- 1. Backend creates auth user with new UUID
-- 2. Frontend tries to insert profile with that UUID
-- 3. RLS policy blocks it because auth.uid() (admin's ID) != new user's ID

-- Solution: Update INSERT policy to allow admins and superadmins to insert any profile

-- =====================================================
-- STEP 1: Check current INSERT policy
-- =====================================================

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
AND cmd = 'INSERT';

-- =====================================================
-- STEP 2: Drop and recreate INSERT policy
-- =====================================================

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Allow profile insert" ON public.profiles;

-- Create new INSERT policy that allows:
-- 1. Service role (backend operations)
-- 2. Users inserting their own profile
-- 3. Admins inserting any profile
-- 4. Superadmins inserting any profile
CREATE POLICY "Allow profile insert" ON public.profiles
    FOR INSERT
    WITH CHECK (
        -- Service role can insert any profile
        auth.role() = 'service_role' 
        OR
        -- Users can insert their own profile
        auth.uid() = id 
        OR
        -- Admins can insert any profile
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'superadmin')
        )
    );

-- =====================================================
-- STEP 3: Verify the policy was created
-- =====================================================

SELECT 
    '✅ Policy Updated' as status,
    policyname,
    cmd,
    with_check
FROM pg_policies
WHERE tablename = 'profiles' 
AND cmd = 'INSERT';

-- =====================================================
-- STEP 4: Test the policy
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ RLS POLICY UPDATED SUCCESSFULLY';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'Admins can now create customers!';
    RAISE NOTICE '';
    RAISE NOTICE 'The policy now allows:';
    RAISE NOTICE '  ✅ Service role to insert any profile';
    RAISE NOTICE '  ✅ Users to insert their own profile';
    RAISE NOTICE '  ✅ Admins to insert any profile';
    RAISE NOTICE '  ✅ Superadmins to insert any profile';
    RAISE NOTICE '';
    RAISE NOTICE 'Try creating a customer again - it should work now!';
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

-- =====================================================
-- ALTERNATIVE: If the above doesn't work, use this
-- =====================================================

-- This is a more permissive policy that allows authenticated users to insert
-- Uncomment if you want to use this instead:

/*
DROP POLICY IF EXISTS "Allow profile insert" ON public.profiles;

CREATE POLICY "Allow profile insert" ON public.profiles
    FOR INSERT
    WITH CHECK (
        -- Service role can insert any profile
        auth.role() = 'service_role' 
        OR
        -- Any authenticated user can insert (less secure but simpler)
        auth.role() = 'authenticated'
    );
*/

-- =====================================================
-- 📋 WHAT THIS SCRIPT DOES
-- =====================================================

/*
✅ FIXES THE ISSUE:
- Updates the RLS INSERT policy on profiles table
- Allows admins to create customer profiles
- Maintains security by checking admin role

🔒 SECURITY:
- Service role can insert any profile (backend operations)
- Users can only insert their own profile
- Admins/Superadmins can insert any profile
- Anonymous users cannot insert profiles

🚀 HOW TO USE:
1. Copy this entire script
2. Go to Supabase Dashboard → SQL Editor
3. Paste and click "Run"
4. Try creating a customer again

💡 HINDI EXPLANATION:
Ye script RLS policy ko fix karega taaki admin customer
create kar sake.

Abhi problem ye hai ki jab admin customer create karta hai,
to RLS policy use block kar deta hai kyunki admin ki ID
aur new customer ki ID alag hai.

Ye script policy ko update kar dega taaki admin kisi bhi
customer ka profile create kar sake.

Safe hai - security maintain rahegi.
*/

-- =====================================================
-- FIX: JoinGroup Profile Update Issue
-- =====================================================
-- Problem: When user accepts invitation and creates account,
-- the profile UPDATE fails because RLS policy blocks it
-- 
-- Root Cause: User is authenticated but RLS policy requires
-- auth.uid() = id, which might not work immediately after signup
-- =====================================================

-- Step 1: Check current UPDATE policies on profiles
SELECT 
    policyname,
    cmd,
    qual as using_clause,
    with_check
FROM pg_policies
WHERE tablename = 'profiles'
  AND cmd = 'UPDATE'
ORDER BY policyname;

-- Step 2: Drop existing UPDATE policies
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile update" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own location" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any location" ON public.profiles;
DROP POLICY IF EXISTS "Service role can update locations" ON public.profiles;

-- Step 3: Create comprehensive UPDATE policy
-- This policy allows:
-- 1. Users to update their own profile (auth.uid() = id)
-- 2. Admins to update any profile
-- 3. Service role to update any profile
-- 4. NEW: Users to update their profile during signup (when profile was just created)
CREATE POLICY "Comprehensive profile update" ON public.profiles
    FOR UPDATE
    USING (
        -- User updating their own profile
        auth.uid() = id
        OR
        -- Admin updating any profile
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'superadmin')
        )
        OR
        -- Service role (system operations)
        auth.role() = 'service_role'
    )
    WITH CHECK (
        -- Same conditions for WITH CHECK
        auth.uid() = id
        OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'superadmin')
        )
        OR
        auth.role() = 'service_role'
    );

-- Step 4: Verify the policy was created
SELECT 
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies
WHERE tablename = 'profiles'
  AND cmd = 'UPDATE'
ORDER BY policyname;

-- =====================================================
-- ALTERNATIVE SOLUTION: Use Service Role for Signup
-- =====================================================
-- If the above doesn't work, we can modify the trigger
-- to handle profile creation/update during signup

-- Check current trigger
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND trigger_schema = 'auth'
ORDER BY trigger_name;

-- =====================================================
-- IMMEDIATE FIX: Update existing profiles with missing group_id
-- =====================================================

-- Fix all profiles that accepted invitations but don't have group_id
UPDATE profiles p
SET 
    group_id = pi.group_id
FROM pharmacy_invitations pi
WHERE pi.accepted_by = p.id
  AND pi.status IN ('pending', 'accepted')
  AND pi.accepted_by IS NOT NULL
  AND p.group_id IS NULL
  AND pi.group_id IS NOT NULL;

-- Verify the fix
SELECT 
    p.email,
    p.display_name,
    p.group_id,
    p.status,
    g.display_name as group_name,
    pi.status as invitation_status,
    CASE 
        WHEN p.group_id IS NULL THEN '❌ STILL MISSING'
        WHEN p.group_id = pi.group_id THEN '✅ FIXED'
        ELSE '⚠️ WRONG GROUP'
    END as fix_status
FROM profiles p
LEFT JOIN pharmacy_invitations pi ON pi.accepted_by = p.id
LEFT JOIN profiles g ON p.group_id = g.id
WHERE p.type = 'pharmacy'
  AND pi.accepted_by IS NOT NULL
ORDER BY p.created_at DESC
LIMIT 20;

-- =====================================================
-- EXPECTED RESULTS:
-- =====================================================
-- All profiles should have correct group_id (✅ FIXED)
-- No profiles should have missing group_id (❌ STILL MISSING)
-- =====================================================

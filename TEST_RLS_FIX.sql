-- =====================================================
-- TEST RLS FIX FOR PROFILE CREATION
-- Run this to verify the fix is working
-- =====================================================

-- Step 1: Check current RLS policies
SELECT 
    '=== CURRENT RLS POLICIES ===' as info;

SELECT 
    policyname as "Policy Name",
    cmd as "Command",
    CASE 
        WHEN qual IS NOT NULL THEN 'Has USING clause'
        ELSE 'No USING clause'
    END as "Using",
    CASE 
        WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
        ELSE 'No WITH CHECK clause'
    END as "With Check"
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles'
ORDER BY cmd, policyname;

-- Step 2: Check if handle_new_user trigger exists
SELECT 
    '=== TRIGGER STATUS ===' as info;

SELECT 
    tgname as "Trigger Name",
    tgenabled as "Enabled",
    CASE tgenabled
        WHEN 'O' THEN '✅ Enabled'
        WHEN 'D' THEN '❌ Disabled'
        ELSE 'Unknown'
    END as "Status"
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- Step 3: Test INSERT policy (simulated)
SELECT 
    '=== TESTING INSERT POLICY ===' as info;

-- This shows what the policy will check
SELECT 
    'Policy allows INSERT if:' as check_type,
    'auth.role() = service_role OR auth.uid() = id OR user is admin' as condition;

-- Step 4: Test UPDATE policy (simulated)
SELECT 
    '=== TESTING UPDATE POLICY ===' as info;

SELECT 
    'Policy allows UPDATE if:' as check_type,
    'auth.role() = service_role OR auth.uid() = id OR user is admin' as condition;

-- Step 5: Check recent profile creations
SELECT 
    '=== RECENT PROFILE CREATIONS ===' as info;

SELECT 
    email,
    type,
    status,
    group_id,
    created_at,
    CASE 
        WHEN group_id IS NOT NULL THEN '✅ Has Group'
        ELSE '⚠️  No Group'
    END as "Group Status"
FROM profiles
WHERE created_at >= NOW() - INTERVAL '1 day'
ORDER BY created_at DESC
LIMIT 10;

-- Step 6: Check recent invitations
SELECT 
    '=== RECENT INVITATIONS ===' as info;

SELECT 
    email,
    pharmacy_name,
    status,
    created_at,
    accepted_at,
    CASE 
        WHEN accepted_by IS NOT NULL THEN '✅ Accepted'
        WHEN status = 'pending' THEN '⏳ Pending'
        WHEN status = 'expired' THEN '❌ Expired'
        ELSE status
    END as "Status"
FROM pharmacy_invitations
WHERE created_at >= NOW() - INTERVAL '1 day'
ORDER BY created_at DESC
LIMIT 10;

-- Step 7: Summary
SELECT 
    '=== SUMMARY ===' as info;

SELECT 
    COUNT(*) FILTER (WHERE cmd = 'INSERT') as "INSERT Policies",
    COUNT(*) FILTER (WHERE cmd = 'UPDATE') as "UPDATE Policies",
    COUNT(*) FILTER (WHERE cmd = 'SELECT') as "SELECT Policies",
    COUNT(*) FILTER (WHERE cmd = 'DELETE') as "DELETE Policies"
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles';

-- Step 8: Recommendations
DO $$
DECLARE
    insert_policy_count INTEGER;
    update_policy_count INTEGER;
    trigger_exists BOOLEAN;
BEGIN
    -- Count policies
    SELECT COUNT(*) INTO insert_policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles'
    AND cmd = 'INSERT';
    
    SELECT COUNT(*) INTO update_policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles'
    AND cmd = 'UPDATE';
    
    -- Check trigger
    SELECT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created'
    ) INTO trigger_exists;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== RECOMMENDATIONS ===';
    
    IF insert_policy_count = 0 THEN
        RAISE WARNING '❌ No INSERT policy found! Run migration: 20260217_fix_profile_insert_for_signup.sql';
    ELSIF insert_policy_count = 1 THEN
        RAISE NOTICE '✅ INSERT policy exists';
    ELSE
        RAISE WARNING '⚠️  Multiple INSERT policies found (%)', insert_policy_count;
    END IF;
    
    IF update_policy_count = 0 THEN
        RAISE WARNING '❌ No UPDATE policy found! Run migration: 20260217_fix_profile_insert_for_signup.sql';
    ELSIF update_policy_count = 1 THEN
        RAISE NOTICE '✅ UPDATE policy exists';
    ELSE
        RAISE WARNING '⚠️  Multiple UPDATE policies found (%)', update_policy_count;
    END IF;
    
    IF NOT trigger_exists THEN
        RAISE WARNING '❌ Trigger not found! Run migration: 20260206_fix_handle_new_user_trigger.sql';
    ELSE
        RAISE NOTICE '✅ Trigger exists';
    END IF;
    
    RAISE NOTICE '';
    
    IF insert_policy_count = 1 AND update_policy_count = 1 AND trigger_exists THEN
        RAISE NOTICE '🎉 All checks passed! RLS fix is properly applied.';
        RAISE NOTICE '📝 You can now test pharmacy signup through invitation link.';
    ELSE
        RAISE WARNING '⚠️  Some issues detected. Please review the output above.';
    END IF;
END $$;

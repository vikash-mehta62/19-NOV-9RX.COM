-- =====================================================
-- FIX MISSING GROUP_ID IN PROFILES
-- =====================================================
-- This script fixes profiles that accepted invitations but don't have group_id set

-- Step 1: Identify affected profiles
SELECT 
    pi.email,
    pi.pharmacy_name,
    pi.group_id as expected_group_id,
    pi.accepted_by as profile_id,
    p.group_id as current_group_id,
    p.status as profile_status,
    '❌ NEEDS FIX' as issue
FROM pharmacy_invitations pi
JOIN profiles p ON pi.accepted_by = p.id
WHERE pi.status IN ('pending', 'accepted')
  AND pi.accepted_by IS NOT NULL
  AND p.group_id IS NULL;

-- Step 2: Fix the missing group_id
-- This will update profiles to have the correct group_id from their invitation
UPDATE profiles p
SET 
    group_id = pi.group_id,
    updated_at = NOW()
FROM pharmacy_invitations pi
WHERE pi.accepted_by = p.id
  AND pi.status IN ('pending', 'accepted')
  AND pi.accepted_by IS NOT NULL
  AND p.group_id IS NULL
  AND pi.group_id IS NOT NULL;

-- Step 3: Verify the fix
SELECT 
    pi.email,
    pi.pharmacy_name,
    pi.group_id as expected_group_id,
    pi.accepted_by as profile_id,
    p.group_id as current_group_id,
    p.status as profile_status,
    g.display_name as group_name,
    CASE 
        WHEN p.group_id IS NULL THEN '❌ STILL MISSING'
        WHEN p.group_id = pi.group_id THEN '✅ FIXED'
        ELSE '⚠️ WRONG GROUP'
    END as fix_status
FROM pharmacy_invitations pi
JOIN profiles p ON pi.accepted_by = p.id
LEFT JOIN profiles g ON p.group_id = g.id
WHERE pi.status IN ('pending', 'accepted')
  AND pi.accepted_by IS NOT NULL
ORDER BY pi.accepted_at DESC;

-- =====================================================
-- SPECIFIC FIX FOR vekariyajay48@gmail.com
-- =====================================================

-- Check current state
SELECT 
    p.id,
    p.email,
    p.display_name,
    p.group_id as current_group_id,
    p.status,
    pi.group_id as expected_group_id,
    pi.status as invitation_status
FROM profiles p
LEFT JOIN pharmacy_invitations pi ON pi.accepted_by = p.id
WHERE p.email = 'vekariyajay48@gmail.com';

-- Fix for Jay Vekariya
UPDATE profiles
SET 
    group_id = (
        SELECT group_id 
        FROM pharmacy_invitations 
        WHERE accepted_by = 'da73c52b-76d9-4dd1-bc6c-9fdc56f9c20d'
        ORDER BY accepted_at DESC 
        LIMIT 1
    )
WHERE id = 'da73c52b-76d9-4dd1-bc6c-9fdc56f9c20d'
  AND group_id IS NULL;

-- Verify the fix
SELECT 
    p.id,
    p.email,
    p.display_name,
    p.group_id,
    p.status,
    g.display_name as group_name,
    g.company_name as group_company
FROM profiles p
LEFT JOIN profiles g ON p.group_id = g.id
WHERE p.email = 'vekariyajay48@gmail.com';

-- =====================================================
-- PREVENTION: Check RLS Policies
-- =====================================================

-- Check if users can update their own group_id during signup
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
  AND cmd IN ('INSERT', 'UPDATE')
ORDER BY policyname;

-- =====================================================
-- EXPECTED RESULTS:
-- =====================================================
-- Step 1: Should show profiles with missing group_id
-- Step 2: Should update those profiles
-- Step 3: Should show all profiles with correct group_id (✅ FIXED)
-- =====================================================

-- =====================================================
-- TEST: Admin Approval Sync with pharmacy_invitations
-- =====================================================
-- This script tests if admin approval syncs with pharmacy_invitations table

-- Step 1: Check current state BEFORE admin approval
-- Find a pending pharmacy
SELECT 
    p.id as profile_id,
    p.email,
    p.display_name,
    p.status as profile_status,
    p.account_status,
    p.group_id,
    pi.id as invitation_id,
    pi.status as invitation_status,
    pi.accepted_by,
    pi.group_id as invitation_group_id,
    CASE 
        WHEN p.status = 'pending' AND pi.status = 'pending' THEN '⏳ Ready for approval'
        WHEN p.status = 'active' AND pi.status = 'pending' THEN '❌ NOT SYNCED'
        WHEN p.status = 'active' AND pi.status = 'accepted' THEN '✅ SYNCED'
        ELSE '❓ Unknown state'
    END as sync_status
FROM profiles p
LEFT JOIN pharmacy_invitations pi ON pi.email = p.email
WHERE p.type = 'pharmacy'
  AND p.email = 'vekariyajay48@gmail.com'
ORDER BY p.created_at DESC;

-- Step 2: Simulate what happens when admin approves
-- This shows what the UPDATE query should match

-- Check if accepted_by matches
SELECT 
    pi.id,
    pi.email,
    pi.status,
    pi.accepted_by,
    p.id as profile_id,
    CASE 
        WHEN pi.accepted_by = p.id THEN '✅ Will match by accepted_by'
        WHEN pi.accepted_by IS NULL THEN '❌ accepted_by is NULL - need fallback'
        WHEN pi.accepted_by != p.id THEN '❌ accepted_by mismatch - need fallback'
        ELSE '❓ Unknown'
    END as match_status
FROM pharmacy_invitations pi
LEFT JOIN profiles p ON pi.email = p.email
WHERE pi.email = 'vekariyajay48@gmail.com'
  AND pi.status = 'pending';

-- Step 3: Test the primary UPDATE query (what code tries first)
-- This is what the code does: .eq('accepted_by', userId).eq('status', 'pending')
SELECT 
    pi.id,
    pi.email,
    pi.status,
    pi.accepted_by,
    p.id as profile_id,
    'This row will be updated by primary query' as note
FROM pharmacy_invitations pi
JOIN profiles p ON pi.email = p.email
WHERE pi.accepted_by = p.id
  AND pi.status = 'pending'
  AND pi.email = 'vekariyajay48@gmail.com';

-- If above returns EMPTY, then fallback is needed!

-- Step 4: Test the fallback UPDATE query (what code tries if primary fails)
-- This is the fallback: .eq('group_id', group_id).eq('email', email).eq('status', 'pending')
SELECT 
    pi.id,
    pi.email,
    pi.status,
    pi.group_id,
    pi.accepted_by,
    p.id as profile_id,
    p.group_id as profile_group_id,
    'This row will be updated by fallback query' as note
FROM pharmacy_invitations pi
JOIN profiles p ON pi.email = p.email
WHERE pi.group_id = p.group_id
  AND pi.email = p.email
  AND pi.status = 'pending'
  AND pi.email = 'vekariyajay48@gmail.com';

-- Step 5: Manual fix if code is not deployed yet
-- Run this to manually sync the invitation status
UPDATE pharmacy_invitations pi
SET 
    status = 'accepted',
    accepted_by = COALESCE(pi.accepted_by, p.id)
FROM profiles p
WHERE pi.email = p.email
  AND pi.email = 'vekariyajay48@gmail.com'
  AND pi.status = 'pending'
  AND p.status = 'active'
RETURNING pi.id, pi.email, pi.status, pi.accepted_by;

-- Step 6: Verify the sync
SELECT 
    p.id as profile_id,
    p.email,
    p.display_name,
    p.status as profile_status,
    p.account_status,
    pi.id as invitation_id,
    pi.status as invitation_status,
    pi.accepted_by,
    CASE 
        WHEN p.status = 'active' AND pi.status = 'accepted' THEN '✅ SYNCED'
        WHEN p.status = 'active' AND pi.status = 'pending' THEN '❌ NOT SYNCED'
        ELSE '❓ Unknown'
    END as sync_status
FROM profiles p
LEFT JOIN pharmacy_invitations pi ON pi.email = p.email
WHERE p.type = 'pharmacy'
  AND p.email = 'vekariyajay48@gmail.com';

-- =====================================================
-- DEBUGGING: Check why sync is not happening
-- =====================================================

-- Check 1: Is group_id set in profile?
SELECT 
    email,
    group_id,
    CASE 
        WHEN group_id IS NULL THEN '❌ group_id is NULL - fallback will fail'
        ELSE '✅ group_id is set'
    END as group_id_status
FROM profiles
WHERE email = 'vekariyajay48@gmail.com';

-- Check 2: Is accepted_by set in invitation?
SELECT 
    email,
    accepted_by,
    CASE 
        WHEN accepted_by IS NULL THEN '❌ accepted_by is NULL - primary query will fail'
        ELSE '✅ accepted_by is set'
    END as accepted_by_status
FROM pharmacy_invitations
WHERE email = 'vekariyajay48@gmail.com';

-- Check 3: Do group_id values match?
SELECT 
    pi.email,
    pi.group_id as invitation_group_id,
    p.group_id as profile_group_id,
    CASE 
        WHEN pi.group_id = p.group_id THEN '✅ group_id matches'
        WHEN pi.group_id IS NULL THEN '❌ invitation group_id is NULL'
        WHEN p.group_id IS NULL THEN '❌ profile group_id is NULL'
        ELSE '❌ group_id mismatch'
    END as group_id_match
FROM pharmacy_invitations pi
LEFT JOIN profiles p ON pi.email = p.email
WHERE pi.email = 'vekariyajay48@gmail.com';

-- =====================================================
-- EXPECTED RESULTS:
-- =====================================================
-- Step 1: Shows current state (likely NOT SYNCED)
-- Step 2: Shows if primary or fallback query will work
-- Step 3: Shows if primary query matches any rows
-- Step 4: Shows if fallback query matches any rows
-- Step 5: Manually syncs the invitation
-- Step 6: Confirms sync is complete (✅ SYNCED)
-- =====================================================

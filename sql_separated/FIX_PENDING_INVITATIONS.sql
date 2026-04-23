-- =====================================================
-- FIX: Pending Invitations for Active Profiles
-- =====================================================
-- Problem: Admin ne approve kar diya but invitation status
-- "pending" hi reh gaya, "accepted" nahi hua
-- =====================================================

-- Step 1: Identify invitations that should be "accepted"
-- These are invitations where:
-- - Profile is active (admin approved)
-- - Invitation status is still "pending"
SELECT 
    pi.id as invitation_id,
    pi.email,
    pi.pharmacy_name,
    pi.status as invitation_status,
    pi.accepted_by,
    p.id as profile_id,
    p.status as profile_status,
    p.account_status,
    '❌ NEEDS FIX' as issue
FROM pharmacy_invitations pi
JOIN profiles p ON pi.email = p.email
WHERE pi.status = 'pending'
  AND p.status = 'active'
  AND p.type = 'pharmacy'
  AND pi.accepted_by IS NOT NULL;

-- Step 2: Fix the invitations
-- Update invitation status to "accepted" for active profiles
UPDATE pharmacy_invitations pi
SET 
    status = 'accepted'
FROM profiles p
WHERE pi.email = p.email
  AND pi.status = 'pending'
  AND p.status = 'active'
  AND p.type = 'pharmacy'
  AND pi.accepted_by IS NOT NULL;

-- Step 3: Also fix invitations where accepted_by is NULL
-- Match by email and set accepted_by
UPDATE pharmacy_invitations pi
SET 
    status = 'accepted',
    accepted_by = p.id
FROM profiles p
WHERE pi.email = p.email
  AND pi.status = 'pending'
  AND p.status = 'active'
  AND p.type = 'pharmacy'
  AND pi.accepted_by IS NULL;

-- Step 4: Verify the fix
SELECT 
    pi.id as invitation_id,
    pi.email,
    pi.pharmacy_name,
    pi.status as invitation_status,
    pi.accepted_by,
    p.id as profile_id,
    p.status as profile_status,
    p.account_status,
    g.display_name as group_name,
    CASE 
        WHEN pi.status = 'accepted' AND p.status = 'active' THEN '✅ FIXED'
        WHEN pi.status = 'pending' AND p.status = 'active' THEN '❌ STILL PENDING'
        WHEN pi.status = 'pending' AND p.status = 'pending' THEN '⏳ WAITING FOR APPROVAL'
        ELSE '❓ UNKNOWN'
    END as fix_status
FROM pharmacy_invitations pi
JOIN profiles p ON pi.email = p.email
LEFT JOIN profiles g ON pi.group_id = g.id
WHERE p.type = 'pharmacy'
  AND pi.accepted_by IS NOT NULL
ORDER BY p.created_at DESC;

-- =====================================================
-- SPECIFIC FIX FOR vekariyajay48@gmail.com
-- =====================================================

-- Check current state
SELECT 
    pi.id,
    pi.email,
    pi.pharmacy_name,
    pi.status as invitation_status,
    pi.accepted_by,
    p.id as profile_id,
    p.status as profile_status,
    p.account_status
FROM pharmacy_invitations pi
LEFT JOIN profiles p ON pi.email = p.email
WHERE pi.email = 'vekariyajay48@gmail.com';

-- Fix for Jay Vekariya
UPDATE pharmacy_invitations pi
SET 
    status = 'accepted',
    accepted_by = COALESCE(pi.accepted_by, p.id)
FROM profiles p
WHERE pi.email = 'vekariyajay48@gmail.com'
  AND p.email = 'vekariyajay48@gmail.com'
  AND pi.status = 'pending'
  AND p.status = 'active';

-- Verify the fix
SELECT 
    pi.id,
    pi.email,
    pi.pharmacy_name,
    pi.status as invitation_status,
    pi.accepted_by,
    p.id as profile_id,
    p.status as profile_status,
    g.display_name as group_name,
    CASE 
        WHEN pi.status = 'accepted' THEN '✅ FIXED'
        ELSE '❌ NOT FIXED'
    END as result
FROM pharmacy_invitations pi
LEFT JOIN profiles p ON pi.email = p.email
LEFT JOIN profiles g ON pi.group_id = g.id
WHERE pi.email = 'vekariyajay48@gmail.com';

-- =====================================================
-- COUNT AFFECTED INVITATIONS
-- =====================================================

SELECT 
    COUNT(*) as total_pending_invitations,
    COUNT(CASE WHEN p.status = 'active' THEN 1 END) as should_be_accepted,
    COUNT(CASE WHEN p.status = 'pending' THEN 1 END) as waiting_approval,
    COUNT(CASE WHEN p.status = 'rejected' THEN 1 END) as should_be_cancelled
FROM pharmacy_invitations pi
LEFT JOIN profiles p ON pi.email = p.email
WHERE pi.status = 'pending'
  AND pi.accepted_by IS NOT NULL;

-- =====================================================
-- EXPECTED RESULTS:
-- =====================================================
-- Step 1: Shows invitations that need fixing
-- Step 2 & 3: Updates those invitations to "accepted"
-- Step 4: All active profiles should have "accepted" invitations (✅ FIXED)
-- =====================================================

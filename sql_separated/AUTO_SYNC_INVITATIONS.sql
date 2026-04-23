-- =====================================================
-- AUTO SYNC: Pharmacy Invitations with Profiles
-- =====================================================
-- This script automatically syncs pharmacy_invitations table
-- with profiles table whenever admin approves a pharmacy
-- =====================================================

-- Step 1: Check current sync status for ALL pharmacies
SELECT 
    p.id as profile_id,
    p.email,
    p.display_name,
    p.status as profile_status,
    p.account_status,
    p.group_id as profile_group_id,
    pi.id as invitation_id,
    pi.status as invitation_status,
    pi.accepted_by,
    pi.group_id as invitation_group_id,
    CASE 
        WHEN p.status = 'active' AND pi.status = 'accepted' THEN '✅ SYNCED'
        WHEN p.status = 'active' AND pi.status = 'pending' THEN '❌ NOT SYNCED - Needs Fix'
        WHEN p.status = 'pending' AND pi.status = 'pending' THEN '⏳ WAITING - Admin approval pending'
        WHEN p.status = 'rejected' AND pi.status = 'pending' THEN '❌ NOT SYNCED - Should be cancelled'
        ELSE '❓ UNKNOWN'
    END as sync_status
FROM profiles p
LEFT JOIN pharmacy_invitations pi ON pi.email = p.email
WHERE p.type = 'pharmacy'
ORDER BY p.created_at DESC;

-- Step 2: Auto-fix ALL invitations where profile is active but invitation is pending
-- This handles the case where admin approved but invitation didn't sync
UPDATE pharmacy_invitations pi
SET 
    status = 'accepted',
    accepted_by = COALESCE(pi.accepted_by, p.id)
FROM profiles p
WHERE pi.email = p.email
  AND p.type = 'pharmacy'
  AND p.status = 'active'
  AND pi.status = 'pending';

-- Step 3: Auto-fix ALL invitations where profile is rejected but invitation is pending
-- This handles the case where admin rejected but invitation didn't sync
UPDATE pharmacy_invitations pi
SET 
    status = 'cancelled'
FROM profiles p
WHERE pi.email = p.email
  AND p.type = 'pharmacy'
  AND p.status = 'rejected'
  AND pi.status = 'pending';

-- Step 4: Auto-fix ALL profiles where group_id is missing
-- This ensures all pharmacies have correct group assignment
UPDATE profiles p
SET 
    group_id = pi.group_id
FROM pharmacy_invitations pi
WHERE pi.email = p.email
  AND p.type = 'pharmacy'
  AND p.group_id IS NULL
  AND pi.group_id IS NOT NULL
  AND pi.accepted_by IS NOT NULL;

-- Step 5: Verify ALL fixes
SELECT 
    p.id as profile_id,
    p.email,
    p.display_name,
    p.status as profile_status,
    p.group_id as profile_group_id,
    pi.id as invitation_id,
    pi.status as invitation_status,
    pi.accepted_by,
    g.display_name as group_name,
    CASE 
        WHEN p.status = 'active' AND pi.status = 'accepted' AND p.group_id IS NOT NULL THEN '✅ FULLY SYNCED'
        WHEN p.status = 'active' AND pi.status = 'accepted' AND p.group_id IS NULL THEN '⚠️ Missing group_id'
        WHEN p.status = 'active' AND pi.status = 'pending' THEN '❌ STILL NOT SYNCED'
        WHEN p.status = 'pending' AND pi.status = 'pending' THEN '⏳ WAITING'
        WHEN p.status = 'rejected' AND pi.status = 'cancelled' THEN '✅ CORRECTLY CANCELLED'
        ELSE '❓ UNKNOWN'
    END as final_status
FROM profiles p
LEFT JOIN pharmacy_invitations pi ON pi.email = p.email
LEFT JOIN profiles g ON p.group_id = g.id
WHERE p.type = 'pharmacy'
ORDER BY p.created_at DESC;

-- Step 6: Count summary
SELECT 
    COUNT(*) as total_pharmacies,
    COUNT(CASE WHEN p.status = 'active' AND pi.status = 'accepted' AND p.group_id IS NOT NULL THEN 1 END) as fully_synced,
    COUNT(CASE WHEN p.status = 'active' AND pi.status = 'pending' THEN 1 END) as not_synced,
    COUNT(CASE WHEN p.status = 'active' AND p.group_id IS NULL THEN 1 END) as missing_group_id,
    COUNT(CASE WHEN p.status = 'pending' THEN 1 END) as waiting_approval,
    COUNT(CASE WHEN p.status = 'rejected' THEN 1 END) as rejected
FROM profiles p
LEFT JOIN pharmacy_invitations pi ON pi.email = p.email
WHERE p.type = 'pharmacy';

-- =====================================================
-- EXPECTED RESULTS:
-- =====================================================
-- Step 1: Shows current sync status for all pharmacies
-- Step 2: Fixes all active profiles with pending invitations
-- Step 3: Fixes all rejected profiles with pending invitations
-- Step 4: Fixes all profiles with missing group_id
-- Step 5: Shows final status after all fixes
-- Step 6: Shows summary count
-- 
-- After running this script:
-- - All active pharmacies should have "accepted" invitations
-- - All rejected pharmacies should have "cancelled" invitations
-- - All pharmacies should have group_id set
-- =====================================================

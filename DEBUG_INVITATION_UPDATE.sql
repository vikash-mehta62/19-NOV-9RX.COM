-- =====================================================
-- DEBUG: Why Invitation Status Not Updating to "Accepted"
-- =====================================================

-- Step 1: Check the specific invitation
SELECT 
    pi.id as invitation_id,
    pi.email,
    pi.pharmacy_name,
    pi.status as current_status,
    pi.group_id,
    pi.accepted_by,
    pi.accepted_at,
    p.id as profile_id,
    p.email as profile_email,
    p.status as profile_status,
    p.account_status,
    p.group_id as profile_group_id,
    CASE 
        WHEN pi.accepted_by IS NULL THEN '❌ accepted_by is NULL'
        WHEN pi.accepted_by != p.id THEN '❌ accepted_by mismatch'
        WHEN pi.status != 'pending' THEN '⚠️ Status is not pending'
        WHEN p.status != 'active' THEN '⚠️ Profile not active yet'
        ELSE '✅ Ready for update'
    END as update_status
FROM pharmacy_invitations pi
LEFT JOIN profiles p ON pi.email = p.email
WHERE pi.email = 'vekariyajay48@gmail.com'
ORDER BY pi.created_at DESC
LIMIT 1;

-- Step 2: Check if the UPDATE query would work
-- This simulates the UPDATE condition
SELECT 
    pi.id,
    pi.email,
    pi.status,
    pi.accepted_by,
    p.id as profile_id,
    CASE 
        WHEN pi.accepted_by = p.id AND pi.status = 'pending' THEN '✅ UPDATE will work'
        WHEN pi.accepted_by IS NULL THEN '❌ accepted_by is NULL - UPDATE will fail'
        WHEN pi.accepted_by != p.id THEN '❌ accepted_by mismatch - UPDATE will fail'
        WHEN pi.status != 'pending' THEN '❌ Status not pending - UPDATE will fail'
        ELSE '❓ Unknown issue'
    END as will_update
FROM pharmacy_invitations pi
LEFT JOIN profiles p ON pi.email = p.email
WHERE pi.email = 'vekariyajay48@gmail.com';

-- Step 3: Check RLS policies on pharmacy_invitations
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual as using_clause,
    with_check
FROM pg_policies
WHERE tablename = 'pharmacy_invitations'
  AND cmd = 'UPDATE'
ORDER BY policyname;

-- Step 4: Try to manually update (as admin)
-- This will show if RLS is blocking the update
UPDATE pharmacy_invitations
SET status = 'accepted'
WHERE email = 'vekariyajay48@gmail.com'
  AND status = 'pending'
RETURNING id, email, status, accepted_by;

-- Step 5: Check if update worked
SELECT 
    pi.id,
    pi.email,
    pi.pharmacy_name,
    pi.status,
    pi.accepted_by,
    p.status as profile_status,
    CASE 
        WHEN pi.status = 'accepted' THEN '✅ UPDATED'
        ELSE '❌ NOT UPDATED'
    END as result
FROM pharmacy_invitations pi
LEFT JOIN profiles p ON pi.email = p.email
WHERE pi.email = 'vekariyajay48@gmail.com';

-- =====================================================
-- EXPECTED ISSUES:
-- =====================================================
-- 1. accepted_by might be NULL (if profile update failed)
-- 2. accepted_by might not match profile.id (if using email instead)
-- 3. RLS policy might be blocking the update
-- 4. Status might already be 'accepted' (but UI showing 'pending')
-- =====================================================

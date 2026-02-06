-- =====================================================
-- FIX ORPHANED USERS - Create Missing Profiles
-- =====================================================
-- This will create profiles for the 3 orphaned users
-- Date: February 6, 2026
-- =====================================================

-- Step 1: Verify orphaned users before fix
SELECT 
    'Before Fix - Orphaned Users' as status,
    COUNT(*) as count
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- Step 2: List the orphaned users
SELECT 
    au.id,
    au.email,
    au.created_at,
    au.raw_user_meta_data->>'first_name' as first_name,
    au.raw_user_meta_data->>'last_name' as last_name
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL
ORDER BY au.created_at DESC;

-- =====================================================
-- Step 3: CREATE PROFILES FOR ORPHANED USERS
-- =====================================================

INSERT INTO profiles (
    id,
    email,
    first_name,
    last_name,
    display_name,
    role,
    type,
    status,
    account_status,
    created_at,
    updated_at
)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'first_name', ''),
    COALESCE(au.raw_user_meta_data->>'last_name', ''),
    COALESCE(
        au.raw_user_meta_data->>'display_name',
        CONCAT(
            COALESCE(au.raw_user_meta_data->>'first_name', ''),
            ' ',
            COALESCE(au.raw_user_meta_data->>'last_name', '')
        ),
        au.email
    ),
    'user',
    'pharmacy',
    'pending',
    'pending',
    au.created_at,
    NOW()
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Step 4: Verify the fix
-- =====================================================

SELECT 
    'After Fix - Orphaned Users' as status,
    COUNT(*) as count
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- Step 5: Show the newly created profiles
SELECT 
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.status,
    p.type,
    p.created_at
FROM profiles p
WHERE p.email IN (
    'vekariyajay48@gmail.com',
    'rishimaheshwari040@gmail.com',
    'firstuser@9rx.com'
)
ORDER BY p.created_at DESC;

-- =====================================================
-- Step 6: Check if these users have pharmacy invitations
-- =====================================================

SELECT 
    pi.id,
    pi.email,
    pi.status as invitation_status,
    pi.group_id,
    pi.created_at as invited_at,
    pi.accepted_at,
    p.id as profile_id,
    p.status as profile_status
FROM pharmacy_invitations pi
LEFT JOIN profiles p ON pi.email = p.email
WHERE pi.email IN (
    'vekariyajay48@gmail.com',
    'rishimaheshwari040@gmail.com',
    'firstuser@9rx.com'
)
ORDER BY pi.created_at DESC;

-- =====================================================
-- Step 7: Link profiles to pharmacy invitations (if applicable)
-- =====================================================

-- Update pharmacy_invitations to link with newly created profiles
UPDATE pharmacy_invitations pi
SET 
    accepted_by = p.id,
    accepted_at = COALESCE(pi.accepted_at, p.created_at),
    status = CASE 
        WHEN pi.status = 'pending' THEN 'accepted'
        ELSE pi.status
    END
FROM profiles p
WHERE pi.email = p.email
AND pi.email IN (
    'vekariyajay48@gmail.com',
    'rishimaheshwari040@gmail.com',
    'firstuser@9rx.com'
)
AND pi.accepted_by IS NULL;

-- =====================================================
-- Step 8: Update profiles with group_id (if from invitation)
-- =====================================================

-- Update profiles with group_id from pharmacy_invitations
UPDATE profiles p
SET 
    group_id = pi.group_id,
    updated_at = NOW()
FROM pharmacy_invitations pi
WHERE p.email = pi.email
AND p.email IN (
    'vekariyajay48@gmail.com',
    'rishimaheshwari040@gmail.com',
    'firstuser@9rx.com'
)
AND pi.status = 'accepted'
AND p.group_id IS NULL;

-- =====================================================
-- Step 9: Final verification
-- =====================================================

SELECT 
    '✅ FINAL STATUS' as check_type,
    'Total Auth Users' as metric,
    COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
    '✅ FINAL STATUS' as check_type,
    'Total Profiles' as metric,
    COUNT(*) as count
FROM profiles
UNION ALL
SELECT 
    '✅ FINAL STATUS' as check_type,
    'Orphaned Users' as metric,
    COUNT(*) as count
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- Show complete details of fixed users
SELECT 
    'Fixed User Details' as info,
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.status,
    p.group_id,
    pi.status as invitation_status,
    CASE 
        WHEN p.group_id IS NOT NULL THEN '✅ Linked to Group'
        ELSE '⚠️ No Group'
    END as group_status
FROM profiles p
LEFT JOIN pharmacy_invitations pi ON p.email = pi.email
WHERE p.email IN (
    'vekariyajay48@gmail.com',
    'rishimaheshwari040@gmail.com',
    'firstuser@9rx.com'
)
ORDER BY p.created_at DESC;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
DECLARE
    orphaned_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphaned_count
    FROM auth.users au
    LEFT JOIN profiles p ON au.id = p.id
    WHERE p.id IS NULL;
    
    IF orphaned_count = 0 THEN
        RAISE NOTICE '✅ SUCCESS! All orphaned users have been fixed!';
        RAISE NOTICE '✅ Profiles created for 3 users';
        RAISE NOTICE '✅ Pharmacy invitations linked (if applicable)';
        RAISE NOTICE '✅ Group IDs updated (if applicable)';
        RAISE NOTICE '';
        RAISE NOTICE '📝 Next Steps:';
        RAISE NOTICE '1. Check Admin Store Approval page';
        RAISE NOTICE '2. Verify users can login';
        RAISE NOTICE '3. Test group invitation flow with new user';
    ELSE
        RAISE NOTICE '⚠️ WARNING: Still % orphaned users remaining', orphaned_count;
        RAISE NOTICE 'Please investigate further';
    END IF;
END $$;

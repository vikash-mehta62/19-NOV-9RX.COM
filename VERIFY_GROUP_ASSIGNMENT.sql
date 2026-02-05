-- =====================================================
-- VERIFICATION SCRIPT FOR GROUP ASSIGNMENT FIX
-- Run these queries to verify the fix is working
-- =====================================================

-- 1. Check all RLS policies on profiles table
SELECT 
    policyname, 
    cmd as operation,
    CASE 
        WHEN qual IS NOT NULL THEN 'USING: ' || qual 
        ELSE 'No USING clause'
    END as using_clause,
    CASE 
        WHEN with_check IS NOT NULL THEN 'WITH CHECK: ' || with_check 
        ELSE 'No WITH CHECK clause'
    END as with_check_clause
FROM pg_policies 
WHERE tablename = 'profiles' 
AND schemaname = 'public'
ORDER BY policyname, cmd;

-- 2. Verify group_id column exists
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'group_id';

-- 3. Check existing groups
SELECT 
    id,
    display_name,
    type,
    email,
    status,
    commission_rate,
    created_at
FROM profiles
WHERE type = 'group'
ORDER BY display_name;

-- 4. Check pharmacies and their group assignments
SELECT 
    p.id,
    p.display_name as pharmacy_name,
    p.email,
    p.status,
    p.group_id,
    g.display_name as group_name,
    g.commission_rate
FROM profiles p
LEFT JOIN profiles g ON g.id = p.group_id
WHERE p.type = 'pharmacy'
ORDER BY p.display_name;

-- 5. Check unassigned pharmacies (not in any group)
SELECT 
    id,
    display_name,
    email,
    status,
    created_at
FROM profiles
WHERE type = 'pharmacy'
    AND group_id IS NULL
ORDER BY display_name;

-- 6. Test the helper function (replace UUIDs with actual values)
-- SELECT assign_pharmacy_to_group(
--     'pharmacy-uuid-here'::UUID,
--     'group-uuid-here'::UUID
-- );

-- 7. Get pharmacies for a specific group (replace UUID with actual group ID)
-- SELECT * FROM get_group_pharmacies('group-uuid-here'::UUID);

-- 8. Check indexes on profiles table
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'profiles'
    AND schemaname = 'public'
    AND indexname LIKE '%group%'
ORDER BY indexname;


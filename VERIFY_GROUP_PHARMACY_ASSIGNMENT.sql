-- =====================================================
-- VERIFY GROUP PHARMACY ASSIGNMENT
-- =====================================================
-- This query verifies that pharmacies are properly assigned to groups
-- after accepting invitations

-- Step 1: Check pharmacy_invitations table
-- Shows all invitations with their status and accepted_by info
SELECT 
    pi.id as invitation_id,
    pi.email as invited_email,
    pi.pharmacy_name,
    pi.status as invitation_status,
    pi.group_id,
    pi.accepted_by,
    pi.accepted_at,
    pi.created_at as invitation_sent_at,
    g.display_name as group_name,
    g.company_name as group_company
FROM pharmacy_invitations pi
LEFT JOIN profiles g ON pi.group_id = g.id
ORDER BY pi.created_at DESC
LIMIT 20;

-- Step 2: Check profiles table for pharmacies with group_id
-- Shows all pharmacies and their group assignments
SELECT 
    p.id as pharmacy_id,
    p.email,
    p.display_name,
    p.company_name,
    p.type,
    p.status,
    p.group_id,
    g.display_name as group_name,
    g.company_name as group_company_name,
    p.created_at as pharmacy_created_at
FROM profiles p
LEFT JOIN profiles g ON p.group_id = g.id
WHERE p.type = 'pharmacy'
ORDER BY p.created_at DESC
LIMIT 20;

-- Step 3: Check for pharmacies that accepted invitations but don't have group_id
-- This should return EMPTY if everything is working correctly
SELECT 
    pi.id as invitation_id,
    pi.email,
    pi.pharmacy_name,
    pi.status as invitation_status,
    pi.group_id as expected_group_id,
    pi.accepted_by,
    p.id as profile_id,
    p.group_id as actual_group_id,
    p.status as profile_status,
    CASE 
        WHEN p.group_id IS NULL THEN '❌ MISSING GROUP_ID'
        WHEN p.group_id != pi.group_id THEN '❌ WRONG GROUP_ID'
        ELSE '✅ CORRECT'
    END as assignment_status
FROM pharmacy_invitations pi
LEFT JOIN profiles p ON pi.accepted_by = p.id
WHERE pi.status IN ('pending', 'accepted')
  AND pi.accepted_by IS NOT NULL
ORDER BY pi.accepted_at DESC;

-- Step 4: Count pharmacies per group
-- Shows how many pharmacies each group has
SELECT 
    g.id as group_id,
    g.display_name as group_name,
    g.company_name,
    COUNT(p.id) as total_pharmacies,
    COUNT(CASE WHEN p.status = 'active' THEN 1 END) as active_pharmacies,
    COUNT(CASE WHEN p.status = 'pending' THEN 1 END) as pending_pharmacies,
    COUNT(CASE WHEN p.status = 'rejected' THEN 1 END) as rejected_pharmacies
FROM profiles g
LEFT JOIN profiles p ON p.group_id = g.id AND p.type = 'pharmacy'
WHERE g.type = 'group'
GROUP BY g.id, g.display_name, g.company_name
ORDER BY total_pharmacies DESC;

-- Step 5: Check for orphaned pharmacies (have group_id but group doesn't exist)
-- This should return EMPTY if everything is working correctly
SELECT 
    p.id as pharmacy_id,
    p.email,
    p.display_name,
    p.company_name,
    p.group_id,
    p.status,
    '❌ GROUP NOT FOUND' as issue
FROM profiles p
LEFT JOIN profiles g ON p.group_id = g.id
WHERE p.type = 'pharmacy'
  AND p.group_id IS NOT NULL
  AND g.id IS NULL;

-- Step 6: Recent invitation acceptances with full details
-- Shows the complete flow for recent invitations
SELECT 
    pi.email as invited_email,
    pi.pharmacy_name,
    pi.status as invitation_status,
    pi.accepted_at,
    p.id as profile_id,
    p.display_name as profile_name,
    p.status as profile_status,
    p.group_id as assigned_group_id,
    g.display_name as group_name,
    CASE 
        WHEN pi.accepted_by IS NULL THEN '⏳ Not accepted yet'
        WHEN p.id IS NULL THEN '❌ Profile not found'
        WHEN p.group_id IS NULL THEN '❌ Group ID missing'
        WHEN p.group_id != pi.group_id THEN '❌ Wrong group assigned'
        WHEN p.status = 'pending' THEN '⏳ Pending admin approval'
        WHEN p.status = 'active' THEN '✅ Active'
        WHEN p.status = 'rejected' THEN '❌ Rejected'
        ELSE '❓ Unknown status'
    END as flow_status
FROM pharmacy_invitations pi
LEFT JOIN profiles p ON pi.accepted_by = p.id
LEFT JOIN profiles g ON pi.group_id = g.id
WHERE pi.created_at > NOW() - INTERVAL '30 days'
ORDER BY pi.created_at DESC
LIMIT 20;

-- =====================================================
-- EXPECTED RESULTS:
-- =====================================================
-- Step 3 should be EMPTY (no missing or wrong group_id)
-- Step 5 should be EMPTY (no orphaned pharmacies)
-- Step 6 should show proper flow status for each invitation
-- =====================================================

-- =====================================================
-- FIX EMAIL CONFIRMATION - CORRECTED VERSION
-- =====================================================
-- Problem: confirmed_at is a generated column, can't update it directly
-- Solution: Only update email_confirmed_at
-- =====================================================

-- =====================================================
-- SOLUTION 1: Confirm Specific User (jayvekariya2003@gmail.com)
-- =====================================================

UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email = 'jayvekariya2003@gmail.com';

-- Verify it worked
SELECT 
    email,
    email_confirmed_at,
    confirmed_at,
    CASE 
        WHEN email_confirmed_at IS NOT NULL THEN '✅ CONFIRMED - Can Login Now!'
        ELSE '❌ NOT CONFIRMED'
    END as status
FROM auth.users 
WHERE email = 'jayvekariya2003@gmail.com';

-- =====================================================
-- SOLUTION 2: Confirm ALL Unconfirmed Users
-- =====================================================

UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- Check how many were confirmed
SELECT 
    COUNT(*) as "Total Confirmed Users"
FROM auth.users 
WHERE email_confirmed_at IS NOT NULL;

-- =====================================================
-- SOLUTION 3: Check All Users Status
-- =====================================================

SELECT 
    email,
    created_at,
    email_confirmed_at,
    CASE 
        WHEN email_confirmed_at IS NOT NULL THEN '✅ Confirmed'
        ELSE '❌ Not Confirmed'
    END as status
FROM auth.users 
ORDER BY created_at DESC
LIMIT 20;

-- =====================================================
-- VERIFICATION: Count Confirmed vs Unconfirmed
-- =====================================================

SELECT 
    'Confirmed Users' as type,
    COUNT(*)::text as count
FROM auth.users 
WHERE email_confirmed_at IS NOT NULL

UNION ALL

SELECT 
    'Unconfirmed Users' as type,
    COUNT(*)::text as count
FROM auth.users 
WHERE email_confirmed_at IS NULL;

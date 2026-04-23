-- =====================================================
-- ACTIVATE USER ACCOUNT
-- =====================================================
-- Problem: "Your account is not active. Please contact support."
-- Solution: Change profile status from 'pending' to 'active'
-- =====================================================

-- =====================================================
-- SOLUTION 1: Activate Specific User (jayvekariya2003@gmail.com)
-- =====================================================

-- Step 1: First confirm email (if not already done)
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email = 'jayvekariya2003@gmail.com'
AND email_confirmed_at IS NULL;

-- Step 2: Activate profile status
UPDATE public.profiles 
SET 
    status = 'active',
    updated_at = NOW()
WHERE email = 'jayvekariya2003@gmail.com';

-- Step 3: Verify both are fixed
SELECT 
    p.email,
    p.status as profile_status,
    u.email_confirmed_at,
    CASE 
        WHEN p.status = 'active' AND u.email_confirmed_at IS NOT NULL 
        THEN '✅ READY TO LOGIN!'
        WHEN p.status != 'active' 
        THEN '❌ Profile not active'
        WHEN u.email_confirmed_at IS NULL 
        THEN '❌ Email not confirmed'
        ELSE '⚠️ Unknown issue'
    END as login_status
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.email = 'jayvekariya2003@gmail.com';

-- =====================================================
-- SOLUTION 2: Activate ALL Pending Users
-- =====================================================

UPDATE public.profiles 
SET 
    status = 'active',
    updated_at = NOW()
WHERE status = 'pending';

-- Check how many were activated
SELECT 
    COUNT(*) as "Users Activated"
FROM public.profiles 
WHERE status = 'active';

-- =====================================================
-- SOLUTION 3: Check All Users Status
-- =====================================================

SELECT 
    p.email,
    p.first_name,
    p.last_name,
    p.type,
    p.status as profile_status,
    p.role,
    u.email_confirmed_at,
    CASE 
        WHEN p.status = 'active' AND u.email_confirmed_at IS NOT NULL 
        THEN '✅ Can Login'
        WHEN p.status = 'pending' 
        THEN '⏳ Pending Approval'
        WHEN u.email_confirmed_at IS NULL 
        THEN '📧 Email Not Confirmed'
        ELSE '❌ Issue'
    END as account_status
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
ORDER BY p.created_at DESC
LIMIT 20;

-- =====================================================
-- SOLUTION 4: Complete Fix for jayvekariya2003@gmail.com
-- =====================================================
-- This does everything in one go

-- Confirm email
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email = 'jayvekariya2003@gmail.com'
AND email_confirmed_at IS NULL;

-- Activate profile
UPDATE public.profiles 
SET status = 'active', updated_at = NOW()
WHERE email = 'jayvekariya2003@gmail.com';

-- Final verification
SELECT 
    '✅ ACCOUNT FULLY ACTIVATED!' as message,
    p.email,
    p.status as profile_status,
    u.email_confirmed_at as email_confirmed,
    'You can now login!' as next_step
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.email = 'jayvekariya2003@gmail.com';

-- =====================================================
-- VERIFICATION: Count Users by Status
-- =====================================================

SELECT 
    status,
    COUNT(*) as count
FROM public.profiles 
GROUP BY status
ORDER BY status;

-- =====================================================
-- BONUS: Make User Admin (Optional)
-- =====================================================
-- Uncomment below if you want to make this user an admin

-- UPDATE public.profiles 
-- SET role = 'admin', updated_at = NOW()
-- WHERE email = 'jayvekariya2003@gmail.com';

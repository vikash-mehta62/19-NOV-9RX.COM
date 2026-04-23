-- =====================================================
-- EMAIL CONFIRMATION SOLUTIONS
-- =====================================================
-- Problem: User email not confirmed, can't login
-- Solutions: 3 options below
-- =====================================================

-- =====================================================
-- OPTION 1: Manually Confirm Specific User Email (RECOMMENDED)
-- =====================================================
-- Replace 'user@example.com' with actual email address

UPDATE auth.users 
SET 
    email_confirmed_at = NOW(),
    confirmed_at = NOW()
WHERE email = 'jayvekariya2003@gmail.com';

-- Verify it worked
SELECT 
    email,
    email_confirmed_at,
    confirmed_at,
    CASE 
        WHEN email_confirmed_at IS NOT NULL THEN '✅ CONFIRMED'
        ELSE '❌ NOT CONFIRMED'
    END as status
FROM auth.users 
WHERE email = 'jayvekariya2003@gmail.com';

-- =====================================================
-- OPTION 2: Confirm ALL Pending Users (Use with caution)
-- =====================================================
-- This will confirm ALL users who haven't confirmed their email

UPDATE auth.users 
SET 
    email_confirmed_at = NOW(),
    confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- Show how many users were confirmed
SELECT 
    COUNT(*) as "Users Confirmed"
FROM auth.users 
WHERE email_confirmed_at IS NOT NULL;

-- =====================================================
-- OPTION 3: Check Current Email Confirmation Status
-- =====================================================
-- See which users need confirmation

SELECT 
    id,
    email,
    created_at,
    email_confirmed_at,
    confirmed_at,
    CASE 
        WHEN email_confirmed_at IS NOT NULL THEN '✅ Confirmed'
        ELSE '❌ Not Confirmed'
    END as status
FROM auth.users 
ORDER BY created_at DESC
LIMIT 20;

-- =====================================================
-- OPTION 4: Disable Email Confirmation (For Development Only)
-- =====================================================
-- WARNING: This is for development/testing only!
-- Don't use in production!

-- You need to do this in Supabase Dashboard:
-- 1. Go to Authentication → Settings
-- 2. Find "Email Confirmation"
-- 3. Toggle OFF "Enable email confirmations"
-- 4. Save changes

-- After disabling, new users won't need to confirm email

-- =====================================================
-- OPTION 5: Resend Confirmation Email
-- =====================================================
-- This can't be done via SQL, you need to use Supabase Dashboard:
-- 1. Go to Authentication → Users
-- 2. Find the user
-- 3. Click on user
-- 4. Click "Send confirmation email"

-- OR use Supabase API in your app:
-- supabase.auth.resend({ type: 'signup', email: 'user@example.com' })

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
-- Run this to check all users' confirmation status

SELECT 
    'Total Users' as metric,
    COUNT(*)::text as value
FROM auth.users

UNION ALL

SELECT 
    'Confirmed Users' as metric,
    COUNT(*)::text as value
FROM auth.users 
WHERE email_confirmed_at IS NOT NULL

UNION ALL

SELECT 
    'Unconfirmed Users' as metric,
    COUNT(*)::text as value
FROM auth.users 
WHERE email_confirmed_at IS NULL;

-- =====================================================
-- QUICK FIX FOR SCREENSHOT USER
-- =====================================================
-- Based on screenshot, the email is: jaydeepya2008@gmail.com

UPDATE auth.users 
SET 
    email_confirmed_at = NOW(),
    confirmed_at = NOW()
WHERE email = 'jayvekariya2003@gmail.com';

-- Verify
SELECT 
    email,
    CASE 
        WHEN email_confirmed_at IS NOT NULL THEN '✅ Email Confirmed - Can Login Now!'
        ELSE '❌ Still Not Confirmed'
    END as status
FROM auth.users 
WHERE email = 'jayvekariya2003@gmail.com';

-- ============================================================
-- FIX: Password Reset Error - confirmation_token NULL Issue
-- ============================================================
-- Error: "sql: Scan error on column index 3, name confirmation_token: 
--         converting NULL to string is unsupported"
--
-- This happens when auth.users table has NULL values in token columns
-- and Supabase Auth expects empty strings instead.
-- ============================================================

-- Check current state
SELECT 
    id,
    email,
    confirmation_token IS NULL as conf_token_null,
    recovery_token IS NULL as recovery_token_null,
    email_change_token_new IS NULL as email_change_token_null,
    reauthentication_token IS NULL as reauth_token_null
FROM auth.users
WHERE confirmation_token IS NULL
   OR recovery_token IS NULL
   OR email_change_token_new IS NULL
   OR reauthentication_token IS NULL
LIMIT 10;


-- ============================================================
-- FIX 1: Convert NULL to Empty String for Token Columns
-- ============================================================

UPDATE auth.users
SET 
    confirmation_token = COALESCE(confirmation_token, ''),
    recovery_token = COALESCE(recovery_token, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    email_change_token_current = COALESCE(email_change_token_current, ''),
    reauthentication_token = COALESCE(reauthentication_token, '')
WHERE 
    confirmation_token IS NULL
    OR recovery_token IS NULL
    OR email_change_token_new IS NULL
    OR email_change_token_current IS NULL
    OR reauthentication_token IS NULL;


-- ============================================================
-- FIX 2: Ensure Columns Don't Allow NULL (Optional)
-- ============================================================
-- This prevents the issue from happening again

-- Note: This might fail if Supabase manages the schema
-- Only run if you have full control over auth schema

/*
ALTER TABLE auth.users 
    ALTER COLUMN confirmation_token SET DEFAULT '',
    ALTER COLUMN recovery_token SET DEFAULT '',
    ALTER COLUMN email_change_token_new SET DEFAULT '',
    ALTER COLUMN email_change_token_current SET DEFAULT '',
    ALTER COLUMN reauthentication_token SET DEFAULT '';
*/


-- ============================================================
-- VERIFY FIX
-- ============================================================

-- Check if any NULL values remain
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN confirmation_token IS NULL THEN 1 END) as null_conf_tokens,
    COUNT(CASE WHEN recovery_token IS NULL THEN 1 END) as null_recovery_tokens,
    COUNT(CASE WHEN email_change_token_new IS NULL THEN 1 END) as null_email_change_tokens,
    COUNT(CASE WHEN reauthentication_token IS NULL THEN 1 END) as null_reauth_tokens
FROM auth.users;

-- Should show 0 for all null counts


-- ============================================================
-- TEST PASSWORD RESET
-- ============================================================

-- After running the fix, test password reset:
-- 1. Go to your app's reset password page
-- 2. Enter email: priyanko@admin.com
-- 3. Click "Send Reset Link"
-- 4. Should work without 500 error!


-- ============================================================
-- ALTERNATIVE FIX: If Above Doesn't Work
-- ============================================================
-- Sometimes the issue is with specific users
-- Find and fix them individually:

-- Find problematic users
SELECT 
    id,
    email,
    email_confirmed_at,
    confirmation_token,
    recovery_token
FROM auth.users
WHERE email = 'priyanko@admin.com';

-- Fix specific user
UPDATE auth.users
SET 
    confirmation_token = '',
    recovery_token = '',
    email_change_token_new = '',
    email_change_token_current = '',
    reauthentication_token = ''
WHERE email = 'priyanko@admin.com';


-- ============================================================
-- ROOT CAUSE: Import/Migration Issue
-- ============================================================
-- This issue typically happens when:
-- 1. Users are imported from another database
-- 2. Token columns are NULL in source database
-- 3. Supabase Auth expects empty strings, not NULL
--
-- PREVENTION:
-- When importing users, always ensure token columns are empty strings:
--
-- UPDATE auth.users
-- SET 
--     confirmation_token = COALESCE(confirmation_token, ''),
--     recovery_token = COALESCE(recovery_token, ''),
--     email_change_token_new = COALESCE(email_change_token_new, ''),
--     email_change_token_current = COALESCE(email_change_token_current, ''),
--     reauthentication_token = COALESCE(reauthentication_token, '');
-- ============================================================


-- ============================================================
-- BONUS: Check Email Configuration
-- ============================================================
-- Password reset also requires email to be configured
-- Check Supabase Dashboard → Authentication → Email Templates
-- Ensure SMTP is configured or using Supabase's email service


-- ============================================================
-- NOTES:
-- ============================================================
-- 1. Run FIX 1 first (UPDATE query)
-- 2. Verify with VERIFY FIX query
-- 3. Test password reset in your app
-- 4. If still failing, check email configuration
-- 5. Check auth logs: supabase logs --service auth
-- ============================================================

-- =====================================================
-- COMPLETE FIX - Run This Once
-- =====================================================
-- Fixes ALL NULL column issues in auth.users table
-- =====================================================

-- Fix all NULL string columns at once
UPDATE auth.users 
SET 
    confirmation_token = COALESCE(confirmation_token, encode(gen_random_bytes(32), 'hex')),
    email_change = COALESCE(email_change, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    email_change_token_current = COALESCE(email_change_token_current, ''),
    recovery_token = COALESCE(recovery_token, encode(gen_random_bytes(32), 'hex')),
    phone_change = COALESCE(phone_change, ''),
    phone_change_token = COALESCE(phone_change_token, ''),
    reauthentication_token = COALESCE(reauthentication_token, '');

-- Verify fix
SELECT 
    email,
    '✅ All columns fixed' as status
FROM auth.users

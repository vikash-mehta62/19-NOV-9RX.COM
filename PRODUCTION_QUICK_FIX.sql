-- =====================================================
-- PRODUCTION QUICK FIX (Minimal Version)
-- =====================================================
-- ✅ Safe for production
-- ✅ Only updates NULL values
-- ✅ Takes 1-2 seconds
-- =====================================================

-- Single safe UPDATE query
UPDATE auth.users 
SET 
    confirmation_token = COALESCE(confirmation_token, encode(gen_random_bytes(32), 'hex')),
    recovery_token = COALESCE(recovery_token, encode(gen_random_bytes(32), 'hex')),
    reauthentication_token = COALESCE(reauthentication_token, ''),
    email_change = COALESCE(email_change, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    email_change_token_current = COALESCE(email_change_token_current, ''),
    phone_change = COALESCE(phone_change, ''),
    phone_change_token = COALESCE(phone_change_token, '')
WHERE 
    confirmation_token IS NULL 
    OR recovery_token IS NULL
    OR reauthentication_token IS NULL
    OR email_change IS NULL
    OR email_change_token_new IS NULL
    OR email_change_token_current IS NULL
    OR phone_change IS NULL
    OR phone_change_token IS NULL;

-- Verify (optional)
SELECT 
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE confirmation_token IS NOT NULL) as fixed_users,
    '✅ Done' as status
FROM auth.users;

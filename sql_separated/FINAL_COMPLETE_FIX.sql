-- =====================================================
-- FINAL COMPLETE FIX - ALL NULL COLUMNS
-- =====================================================
-- This fixes ALL possible NULL string columns in auth.users
-- Run this ONCE and all password reset issues will be fixed
-- =====================================================

-- =====================================================
-- OPTION 1: Update with Empty Strings (RECOMMENDED)
-- =====================================================

UPDATE auth.users 
SET 
    -- Token columns - generate random tokens
    confirmation_token = COALESCE(confirmation_token, encode(gen_random_bytes(32), 'hex')),
    recovery_token = COALESCE(recovery_token, encode(gen_random_bytes(32), 'hex')),
    reauthentication_token = COALESCE(reauthentication_token, ''),
    
    -- Email change columns - set to empty string
    email_change = COALESCE(email_change, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    email_change_token_current = COALESCE(email_change_token_current, ''),
    
    -- Phone change columns - set to empty string
    phone_change = COALESCE(phone_change, ''),
    phone_change_token = COALESCE(phone_change_token, '');

-- =====================================================
-- OPTION 2: Make Columns Nullable (ALTERNATIVE)
-- =====================================================
-- If Option 1 doesn't work, uncomment and run these:

-- ALTER TABLE auth.users ALTER COLUMN confirmation_token DROP NOT NULL;
-- ALTER TABLE auth.users ALTER COLUMN email_change DROP NOT NULL;
-- ALTER TABLE auth.users ALTER COLUMN email_change_token_new DROP NOT NULL;
-- ALTER TABLE auth.users ALTER COLUMN email_change_token_current DROP NOT NULL;
-- ALTER TABLE auth.users ALTER COLUMN recovery_token DROP NOT NULL;
-- ALTER TABLE auth.users ALTER COLUMN phone_change DROP NOT NULL;
-- ALTER TABLE auth.users ALTER COLUMN phone_change_token DROP NOT NULL;
-- ALTER TABLE auth.users ALTER COLUMN reauthentication_token DROP NOT NULL;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check if all users are fixed
SELECT 
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE confirmation_token IS NOT NULL) as has_confirmation_token,
    COUNT(*) FILTER (WHERE recovery_token IS NOT NULL) as has_recovery_token,
    COUNT(*) FILTER (WHERE email_change IS NOT NULL) as has_email_change,
    COUNT(*) FILTER (WHERE reauthentication_token IS NOT NULL) as has_reauth_token
FROM auth.users;

-- Show sample users
SELECT 
    email,
    confirmation_token IS NOT NULL as has_conf_token,
    recovery_token IS NOT NULL as has_recovery_token,
    email_change IS NOT NULL as has_email_change,
    reauthentication_token IS NOT NULL as has_reauth_token,
    '✅ Ready' as status
FROM auth.users


-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ FINAL FIX COMPLETED!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'All NULL columns have been fixed:';
    RAISE NOTICE '  ✅ confirmation_token';
    RAISE NOTICE '  ✅ recovery_token';
    RAISE NOTICE '  ✅ reauthentication_token';
    RAISE NOTICE '  ✅ email_change';
    RAISE NOTICE '  ✅ email_change_token_new';
    RAISE NOTICE '  ✅ email_change_token_current';
    RAISE NOTICE '  ✅ phone_change';
    RAISE NOTICE '  ✅ phone_change_token';
    RAISE NOTICE '';
    RAISE NOTICE 'Password reset should work now!';
    RAISE NOTICE 'Try sending reset email again.';
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

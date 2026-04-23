-- =====================================================
-- FIX ALL NULL COLUMNS IN auth.users
-- =====================================================
-- Error: Multiple columns have NULL values that should be strings
-- Solution: Set empty strings for NULL text columns
-- =====================================================

-- =====================================================
-- STEP 1: Check Current NULL Values
-- =====================================================

SELECT 
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE confirmation_token IS NULL) as null_confirmation_token,
    COUNT(*) FILTER (WHERE email_change IS NULL) as null_email_change,
    COUNT(*) FILTER (WHERE email_change_token_new IS NULL) as null_email_change_token_new,
    COUNT(*) FILTER (WHERE recovery_token IS NULL) as null_recovery_token,
    COUNT(*) FILTER (WHERE phone_change IS NULL) as null_phone_change,
    COUNT(*) FILTER (WHERE phone_change_token IS NULL) as null_phone_change_token
FROM auth.users;

-- =====================================================
-- STEP 2: FIX ALL NULL STRING COLUMNS
-- =====================================================

-- Fix confirmation_token
UPDATE auth.users 
SET confirmation_token = encode(gen_random_bytes(32), 'hex')
WHERE confirmation_token IS NULL;

-- Fix email_change (set to empty string)
UPDATE auth.users 
SET email_change = ''
WHERE email_change IS NULL;

-- Fix email_change_token_new
UPDATE auth.users 
SET email_change_token_new = ''
WHERE email_change_token_new IS NULL;

-- Fix email_change_token_current
UPDATE auth.users 
SET email_change_token_current = ''
WHERE email_change_token_current IS NULL;

-- Fix recovery_token
UPDATE auth.users 
SET recovery_token = encode(gen_random_bytes(32), 'hex')
WHERE recovery_token IS NULL;

-- Fix phone_change
UPDATE auth.users 
SET phone_change = ''
WHERE phone_change IS NULL;

-- Fix phone_change_token
UPDATE auth.users 
SET phone_change_token = ''
WHERE phone_change_token IS NULL;

-- =====================================================
-- STEP 3: VERIFY ALL FIXES
-- =====================================================

SELECT 
    'After Fix' as status,
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE confirmation_token IS NULL) as null_confirmation_token,
    COUNT(*) FILTER (WHERE email_change IS NULL) as null_email_change,
    COUNT(*) FILTER (WHERE email_change_token_new IS NULL) as null_email_change_token_new,
    COUNT(*) FILTER (WHERE recovery_token IS NULL) as null_recovery_token,
    COUNT(*) FILTER (WHERE phone_change IS NULL) as null_phone_change,
    COUNT(*) FILTER (WHERE phone_change_token IS NULL) as null_phone_change_token
FROM auth.users;

-- =====================================================
-- STEP 4: ALTERNATIVE - Make Columns Nullable
-- =====================================================
-- If you prefer to allow NULL values instead of empty strings
-- (Use this ONLY if above approach doesn't work)

-- ALTER TABLE auth.users ALTER COLUMN email_change DROP NOT NULL;
-- ALTER TABLE auth.users ALTER COLUMN email_change_token_new DROP NOT NULL;
-- ALTER TABLE auth.users ALTER COLUMN email_change_token_current DROP NOT NULL;
-- ALTER TABLE auth.users ALTER COLUMN phone_change DROP NOT NULL;
-- ALTER TABLE auth.users ALTER COLUMN phone_change_token DROP NOT NULL;

-- =====================================================
-- STEP 5: TEST PASSWORD RESET
-- =====================================================

-- Check specific user
SELECT 
    email,
    confirmation_token IS NOT NULL as has_confirmation_token,
    email_change as email_change_value,
    recovery_token IS NOT NULL as has_recovery_token,
    '✅ Ready for password reset' as status
FROM auth.users
WHERE email = 'jayvekariya2003@gmail.com';

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ ALL NULL COLUMNS FIXED!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'Fixed columns:';
    RAISE NOTICE '  ✅ confirmation_token';
    RAISE NOTICE '  ✅ email_change';
    RAISE NOTICE '  ✅ email_change_token_new';
    RAISE NOTICE '  ✅ email_change_token_current';
    RAISE NOTICE '  ✅ recovery_token';
    RAISE NOTICE '  ✅ phone_change';
    RAISE NOTICE '  ✅ phone_change_token';
    RAISE NOTICE '';
    RAISE NOTICE 'Next step:';
    RAISE NOTICE '  → Try password reset again';
    RAISE NOTICE '  → Should work now! ✅';
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

-- =====================================================
-- FIX: Confirmation Token NULL Error
-- =====================================================
-- Error: converting NULL to string is unsupported
-- Solution: Generate confirmation tokens for users
-- =====================================================

-- =====================================================
-- STEP 1: Check Current Status
-- =====================================================

-- See which users have NULL confirmation_token
SELECT 
    id,
    email,
    confirmation_token,
    email_confirmed_at,
    CASE 
        WHEN confirmation_token IS NULL THEN '❌ NULL (Problem!)'
        ELSE '✅ Has Token'
    END as token_status
FROM auth.users
ORDER BY created_at DESC
LIMIT 20;

-- =====================================================
-- STEP 2: Fix NULL Confirmation Tokens
-- =====================================================

-- Generate confirmation tokens for all users with NULL
UPDATE auth.users 
SET 
    confirmation_token = encode(gen_random_bytes(32), 'hex'),
    confirmation_sent_at = CASE 
        WHEN confirmation_sent_at IS NULL THEN NOW() 
        ELSE confirmation_sent_at 
    END
WHERE confirmation_token IS NULL;

-- =====================================================
-- STEP 3: Verify Fix
-- =====================================================

-- Check if all users now have tokens
SELECT 
    COUNT(*) as total_users,
    COUNT(confirmation_token) as users_with_token,
    COUNT(*) - COUNT(confirmation_token) as users_without_token
FROM auth.users;

-- Show updated users
SELECT 
    email,
    LEFT(confirmation_token, 20) || '...' as token_preview,
    '✅ Fixed' as status
FROM auth.users
WHERE confirmation_token IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- STEP 4: Fix Recovery Token (For Password Reset)
-- =====================================================

-- Also fix recovery_token if NULL
UPDATE auth.users 
SET recovery_token = encode(gen_random_bytes(32), 'hex')
WHERE recovery_token IS NULL;

-- =====================================================
-- STEP 5: Test Password Reset
-- =====================================================

-- Now try password reset for specific user
-- This should work after running above fixes

-- Check user status
SELECT 
    email,
    email_confirmed_at,
    confirmation_token IS NOT NULL as has_confirmation_token,
    recovery_token IS NOT NULL as has_recovery_token,
    CASE 
        WHEN email_confirmed_at IS NOT NULL 
        AND confirmation_token IS NOT NULL 
        THEN '✅ Ready for password reset'
        ELSE '⚠️ Needs attention'
    END as reset_status
FROM auth.users
WHERE email = 'jayvekariya2003@gmail.com';

-- =====================================================
-- OPTIONAL: Clean Up Old Tokens
-- =====================================================

-- If you want to regenerate all tokens (use with caution)
-- UPDATE auth.users 
-- SET 
--     confirmation_token = encode(gen_random_bytes(32), 'hex'),
--     recovery_token = encode(gen_random_bytes(32), 'hex');

-- =====================================================
-- SUMMARY
-- =====================================================

-- Final verification query
SELECT 
    'Total Users' as metric,
    COUNT(*)::text as value
FROM auth.users

UNION ALL

SELECT 
    'Users with Confirmation Token' as metric,
    COUNT(*)::text as value
FROM auth.users
WHERE confirmation_token IS NOT NULL

UNION ALL

SELECT 
    'Users with Recovery Token' as metric,
    COUNT(*)::text as value
FROM auth.users
WHERE recovery_token IS NOT NULL

UNION ALL

SELECT 
    'Email Confirmed Users' as metric,
    COUNT(*)::text as value
FROM auth.users
WHERE email_confirmed_at IS NOT NULL;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ CONFIRMATION TOKEN FIX COMPLETED!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'What was fixed:';
    RAISE NOTICE '  ✅ Generated confirmation tokens for users';
    RAISE NOTICE '  ✅ Generated recovery tokens for users';
    RAISE NOTICE '  ✅ Set confirmation_sent_at timestamps';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Try password reset again';
    RAISE NOTICE '  2. Check if email is sent';
    RAISE NOTICE '  3. Click reset link';
    RAISE NOTICE '  4. Should work now! ✅';
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

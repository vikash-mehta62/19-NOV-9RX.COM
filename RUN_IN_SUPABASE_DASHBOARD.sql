-- ============================================
-- DISABLE AUTOMATIC PROFILE CREATION TRIGGER
-- ============================================
-- Run this in Supabase Dashboard > SQL Editor
-- This will give you full manual control over profile creation

-- Step 1: Disable the trigger
ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;

-- Step 2: Verify the trigger is disabled
SELECT 
    t.tgname AS trigger_name,
    CASE t.tgenabled 
        WHEN 'O' THEN '✅ ENABLED (automatic profile creation)'
        WHEN 'D' THEN '❌ DISABLED (manual control only)'
        ELSE 'UNKNOWN'
    END AS status
FROM pg_trigger t
WHERE t.tgname = 'on_auth_user_created';

-- Expected result: status should show "❌ DISABLED (manual control only)"

-- ============================================
-- IMPORTANT NOTES:
-- ============================================
-- 1. After running this, profiles will ONLY be created by your manual code
-- 2. The trigger function still exists but won't execute
-- 3. To re-enable later, run: ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;
-- 4. Make sure your SignupForm.tsx code is updated to handle profile creation

-- ============================================
-- TO RE-ENABLE THE TRIGGER (if needed later):
-- ============================================
-- ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;

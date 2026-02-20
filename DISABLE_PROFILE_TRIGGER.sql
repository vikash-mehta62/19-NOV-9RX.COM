-- Option 1: Disable the trigger (keeps it but doesn't execute)
-- Run this if you want to temporarily disable the trigger
ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;

-- Option 2: Drop the trigger completely (removes it)
-- Run this if you want to permanently remove the trigger
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- To re-enable the trigger later (if you used Option 1):
-- ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;

-- Verify trigger status:
SELECT 
    t.tgname AS trigger_name,
    CASE t.tgenabled 
        WHEN 'O' THEN 'ENABLED'
        WHEN 'D' THEN 'DISABLED'
        ELSE 'UNKNOWN'
    END AS status
FROM pg_trigger t
WHERE t.tgname = 'on_auth_user_created';

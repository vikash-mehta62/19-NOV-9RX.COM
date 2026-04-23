-- ==================================================================
-- STEP 1: Find ALL tables that reference profiles
-- ==================================================================

-- Run this query first to see ALL dependencies
SELECT DISTINCT
    tc.table_name,
    tc.constraint_name,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'profiles'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- This will show you ALL tables that need to be handled

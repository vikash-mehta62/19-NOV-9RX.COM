-- ⚠️⚠️⚠️ COMPLETE DATABASE RESET - SAFE VERSION ⚠️⚠️⚠️
-- This version handles ALL foreign key constraints automatically
-- 
-- ⚠️ This is COMPLETELY IRREVERSIBLE!
-- ⚠️ Take a FULL BACKUP before running!

-- ==================================================================
-- METHOD 1: Disable Foreign Key Checks Temporarily (FASTEST)
-- ==================================================================

-- Step 1: Disable all foreign key constraints temporarily
SET session_replication_role = 'replica';

-- Step 2: Delete all data from all tables
DELETE FROM group_status_audit;
DELETE FROM order_activities;
DELETE FROM payment_settings;
DELETE FROM reward_transactions;
DELETE FROM reward_redemptions;
DELETE FROM credit_memos;
DELETE FROM invoices;
DELETE FROM orders;
DELETE FROM locations;
DELETE FROM customer_documents;
DELETE FROM carts;
DELETE FROM profiles;

-- Delete auth tables
DELETE FROM auth.refresh_tokens;
DELETE FROM auth.sessions;
DELETE FROM auth.identities;
DELETE FROM auth.users;

-- Step 3: Re-enable foreign key constraints
SET session_replication_role = 'origin';


-- ==================================================================
-- METHOD 2: Find and Delete All Tables Automatically (SAFEST)
-- ==================================================================

-- This will find ALL tables that reference profiles and delete them first
-- Run this if Method 1 doesn't work

DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Delete from all tables that have foreign keys to profiles
    FOR r IN (
        SELECT DISTINCT
            tc.table_schema,
            tc.table_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu
            ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
            AND ccu.table_name = 'profiles'
            AND tc.table_schema = 'public'
    ) LOOP
        EXECUTE format('DELETE FROM %I.%I', r.table_schema, r.table_name);
        RAISE NOTICE 'Deleted from %.%', r.table_schema, r.table_name;
    END LOOP;
    
    -- Now delete profiles
    DELETE FROM profiles;
    RAISE NOTICE 'Deleted from profiles';
    
    -- Delete auth tables
    DELETE FROM auth.refresh_tokens;
    DELETE FROM auth.sessions;
    DELETE FROM auth.identities;
    DELETE FROM auth.users;
    RAISE NOTICE 'Deleted from auth tables';
END $$;


-- ==================================================================
-- METHOD 3: Drop and Recreate Foreign Keys (NUCLEAR OPTION)
-- ==================================================================

-- Only use this if both methods above fail
-- This will permanently remove foreign key constraints

-- Step 1: Find all foreign key constraints
SELECT 
    'ALTER TABLE ' || tc.table_schema || '.' || tc.table_name || 
    ' DROP CONSTRAINT ' || tc.constraint_name || ';' as drop_command
FROM information_schema.table_constraints tc
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public';

-- Copy the output and run those ALTER TABLE commands
-- Then run the delete queries
-- Then you'll need to recreate the foreign keys (not recommended)


-- ==================================================================
-- VERIFICATION QUERY (Run AFTER deletion)
-- ==================================================================

SELECT 
    'auth.users' as table_name, 
    COUNT(*) as count 
FROM auth.users
UNION ALL
SELECT 'auth.identities', COUNT(*) FROM auth.identities
UNION ALL
SELECT 'auth.sessions', COUNT(*) FROM auth.sessions
UNION ALL
SELECT 'auth.refresh_tokens', COUNT(*) FROM auth.refresh_tokens
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL
SELECT 'locations', COUNT(*) FROM locations
UNION ALL
SELECT 'payment_settings', COUNT(*) FROM payment_settings
UNION ALL
SELECT 'reward_transactions', COUNT(*) FROM reward_transactions
UNION ALL
SELECT 'carts', COUNT(*) FROM carts
UNION ALL
SELECT 'group_status_audit', COUNT(*) FROM group_status_audit
UNION ALL
SELECT 'order_activities', COUNT(*) FROM order_activities;

-- All counts should be 0


-- ==================================================================
-- FIND ALL TABLES THAT NEED TO BE DELETED (DIAGNOSTIC)
-- ==================================================================

-- Run this first to see ALL tables that reference profiles
SELECT DISTINCT
    tc.table_schema,
    tc.table_name,
    tc.constraint_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'profiles'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- This will show you ALL tables that need to be deleted before profiles

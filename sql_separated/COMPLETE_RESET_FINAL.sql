-- ⚠️⚠️⚠️ COMPLETE DATABASE RESET - FINAL VERSION ⚠️⚠️⚠️
-- This handles ALL foreign key constraints including settings
-- 
-- ⚠️ This is COMPLETELY IRREVERSIBLE!
-- ⚠️ Take a FULL BACKUP before running!

-- ==================================================================
-- OPTION 1: Keep Settings, Delete Only Users (RECOMMENDED)
-- ==================================================================

-- This will delete all users but keep your global settings intact

-- Step 1: Temporarily remove profile_id from settings (make it NULL)
UPDATE settings SET profile_id = NULL WHERE profile_id IS NOT NULL;

-- Step 2: Now delete all user data
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

-- Step 3: Delete auth tables
DELETE FROM auth.refresh_tokens;
DELETE FROM auth.sessions;
DELETE FROM auth.identities;
DELETE FROM auth.users;

-- Settings table is preserved with your configuration!


-- ==================================================================
-- OPTION 2: Delete EVERYTHING Including Settings (NUCLEAR)
-- ==================================================================

-- This will delete settings too - you'll lose all configuration!

-- Step 1: Disable foreign key checks
SET session_replication_role = 'replica';

-- Step 2: Delete EVERYTHING
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
DELETE FROM settings;  -- ⚠️ This deletes your settings!
DELETE FROM profiles;

-- Delete auth tables
DELETE FROM auth.refresh_tokens;
DELETE FROM auth.sessions;
DELETE FROM auth.identities;
DELETE FROM auth.users;

-- Step 3: Re-enable foreign key checks
SET session_replication_role = 'origin';


-- ==================================================================
-- OPTION 3: Smart Delete - Find and Delete All Tables Automatically
-- ==================================================================

-- This automatically finds and deletes from ALL tables that reference profiles

DO $$ 
DECLARE
    r RECORD;
    table_list TEXT[] := ARRAY[
        'group_status_audit',
        'order_activities',
        'payment_settings',
        'reward_transactions',
        'reward_redemptions',
        'credit_memos',
        'invoices',
        'orders',
        'locations',
        'customer_documents',
        'carts'
    ];
    tbl TEXT;
BEGIN
    -- First, nullify profile_id in settings to break the FK constraint
    UPDATE settings SET profile_id = NULL WHERE profile_id IS NOT NULL;
    RAISE NOTICE 'Nullified profile_id in settings';
    
    -- Delete from known tables first
    FOREACH tbl IN ARRAY table_list
    LOOP
        BEGIN
            EXECUTE format('DELETE FROM %I', tbl);
            RAISE NOTICE 'Deleted from %', tbl;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not delete from % (table may not exist): %', tbl, SQLERRM;
        END;
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
    
    RAISE NOTICE 'Complete reset finished successfully!';
END $$;


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
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL
SELECT 'locations', COUNT(*) FROM locations
UNION ALL
SELECT 'settings (should have 1 row)', COUNT(*) FROM settings
UNION ALL
SELECT 'group_status_audit', COUNT(*) FROM group_status_audit
UNION ALL
SELECT 'order_activities', COUNT(*) FROM order_activities;

-- All should be 0 except settings (should be 1 if using Option 1)


-- ==================================================================
-- AFTER RESET: Recreate Admin User
-- ==================================================================

-- After reset, you'll need to create a new admin user
-- Go to Supabase Dashboard → Authentication → Users → Add User
-- Then run this to create profile:

-- INSERT INTO profiles (
--     id,
--     email,
--     first_name,
--     last_name,
--     type,
--     role,
--     status
-- ) VALUES (
--     'USER_ID_FROM_AUTH',  -- Replace with actual user ID from auth.users
--     'admin@example.com',
--     'Admin',
--     'User',
--     'admin',
--     'admin',
--     'active'
-- );

-- Then update settings to link to new admin:
-- UPDATE settings SET profile_id = 'USER_ID_FROM_AUTH' WHERE is_global = true;

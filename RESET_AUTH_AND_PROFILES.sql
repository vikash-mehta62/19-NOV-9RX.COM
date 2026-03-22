-- ⚠️⚠️⚠️ EXTREME WARNING ⚠️⚠️⚠️
-- This will DELETE EVERYTHING related to users!
-- - All authentication data
-- - All user profiles
-- - All user identities
-- - All related data (orders, invoices, locations, etc.)
-- 
-- ⚠️ This is COMPLETELY IRREVERSIBLE!
-- ⚠️ Take a FULL BACKUP before running!
-- ⚠️ You will need to re-import all data after this!

-- ==================================================================
-- COMPLETE RESET - DELETE EVERYTHING
-- ==================================================================

-- Step 1: Delete all user-related data from public schema
-- (Delete in order to avoid foreign key constraint errors)

-- Delete audit/log tables first (they reference other tables)
DELETE FROM group_status_audit;
DELETE FROM order_activities;

-- Delete payment settings
DELETE FROM payment_settings;

-- Delete reward transactions
DELETE FROM reward_transactions;

-- Delete reward redemptions
DELETE FROM reward_redemptions;

-- Delete credit memos
DELETE FROM credit_memos;

-- Delete invoices
DELETE FROM invoices;

-- Delete orders
DELETE FROM orders;

-- Delete locations
DELETE FROM locations;

-- Delete customer documents
DELETE FROM customer_documents;

-- Delete carts
DELETE FROM carts;

-- Delete profiles (this will cascade to many related tables)
DELETE FROM profiles;

-- Step 2: Delete all authentication data from auth schema
-- (Requires service role / admin access)

-- Delete all refresh tokens
DELETE FROM auth.refresh_tokens;

-- Delete all sessions
DELETE FROM auth.sessions;

-- Delete all identities (Google, email, etc.)
DELETE FROM auth.identities;

-- Delete all users
DELETE FROM auth.users;

-- Step 3: Reset sequences (optional - for clean IDs on new data)
-- Uncomment if you want to reset auto-increment IDs
-- ALTER SEQUENCE profiles_id_seq RESTART WITH 1;
-- ALTER SEQUENCE orders_id_seq RESTART WITH 1;
-- ALTER SEQUENCE invoices_id_seq RESTART WITH 1;


-- ==================================================================
-- OPTION 2: Delete specific user types only
-- ==================================================================

-- Delete only pharmacy users
DELETE FROM profiles WHERE type = 'pharmacy';
DELETE FROM auth.users WHERE id IN (
  SELECT id FROM profiles WHERE type = 'pharmacy'
);

-- Delete only hospital users
DELETE FROM profiles WHERE type = 'hospital';
DELETE FROM auth.users WHERE id IN (
  SELECT id FROM profiles WHERE type = 'hospital'
);

-- Delete only group users
DELETE FROM profiles WHERE type = 'group';
DELETE FROM auth.users WHERE id IN (
  SELECT id FROM profiles WHERE type = 'group'
);

-- Keep only admin users (delete all non-admin)
DELETE FROM profiles WHERE type NOT IN ('admin', 'superadmin');
DELETE FROM auth.users WHERE id NOT IN (
  SELECT id FROM profiles WHERE type IN ('admin', 'superadmin')
);


-- ==================================================================
-- OPTION 3: Delete specific user by email
-- ==================================================================

-- Replace 'user@example.com' with actual email
DELETE FROM profiles WHERE email = 'user@example.com';
DELETE FROM auth.users WHERE email = 'user@example.com';


-- ==================================================================
-- OPTION 4: Delete all users except specific emails (Keep admins)
-- ==================================================================

-- Keep only these emails, delete rest
DELETE FROM profiles WHERE email NOT IN (
  'admin1@example.com',
  'admin2@example.com'
);

DELETE FROM auth.users WHERE email NOT IN (
  'admin1@example.com',
  'admin2@example.com'
);


-- ==================================================================
-- OPTION 5: Soft delete (Mark as inactive instead of deleting)
-- ==================================================================

-- Mark all non-admin users as inactive
UPDATE profiles 
SET status = 'inactive' 
WHERE type NOT IN ('admin', 'superadmin');


-- ==================================================================
-- VERIFICATION QUERIES (Run AFTER deletion to verify)
-- ==================================================================

-- Verify all tables are empty
SELECT 'auth.users' as table_name, COUNT(*) as count FROM auth.users
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
SELECT 'carts', COUNT(*) FROM carts;

-- All counts should be 0


-- ==================================================================
-- BACKUP QUERIES (Run BEFORE deletion to backup)
-- ==================================================================

-- Backup profiles to a temporary table
CREATE TABLE profiles_backup AS 
SELECT * FROM profiles;

-- Backup auth users (requires service role)
-- Note: You may need to export this via Supabase Dashboard


-- ==================================================================
-- RESTORE FROM BACKUP (If you made a mistake)
-- ==================================================================

-- Restore profiles from backup
INSERT INTO profiles 
SELECT * FROM profiles_backup;

-- Drop backup table after restore
DROP TABLE profiles_backup;


-- ==================================================================
-- NOTES:
-- ==================================================================

-- 1. Always run verification queries first to see what will be deleted
-- 2. Take a backup before running delete queries
-- 3. auth.users deletion requires service role access
-- 4. Deleting users will also delete related data (orders, invoices, etc.)
-- 5. Consider soft delete (marking inactive) instead of hard delete
-- 6. Run these queries in Supabase Dashboard → SQL Editor


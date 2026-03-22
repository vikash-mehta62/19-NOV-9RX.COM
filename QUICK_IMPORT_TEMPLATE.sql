-- ============================================================
-- QUICK IMPORT TEMPLATE - Direct Copy-Paste Ready
-- ============================================================
-- Ye file directly run kar sakte ho for complete user import
-- 
-- STEPS:
-- 1. Source database se data export karo (Section A)
-- 2. Target database reset karo (Section B)
-- 3. Target database me import karo (Section C)
-- 4. Verify karo (Section D)
-- ============================================================


-- ============================================================
-- SECTION A: SOURCE DATABASE - Export Queries
-- ============================================================
-- Ye queries SOURCE database pe run karo

-- A1. Export auth.users
COPY (
    SELECT * FROM auth.users ORDER BY created_at
) TO '/tmp/auth_users_export.csv' WITH CSV HEADER;

-- A2. Export auth.identities  
COPY (
    SELECT * FROM auth.identities ORDER BY created_at
) TO '/tmp/auth_identities_export.csv' WITH CSV HEADER;

-- A3. Export auth.refresh_tokens (optional - for active sessions)
COPY (
    SELECT * FROM auth.refresh_tokens ORDER BY created_at
) TO '/tmp/auth_refresh_tokens_export.csv' WITH CSV HEADER;

-- A4. Export profiles
COPY (
    SELECT * FROM profiles ORDER BY created_at
) TO '/tmp/profiles_export.csv' WITH CSV HEADER;

-- A5. Export customers (if needed)
COPY (
    SELECT * FROM customers ORDER BY created_at
) TO '/tmp/customers_export.csv' WITH CSV HEADER;

-- A6. Export locations (if needed)
COPY (
    SELECT * FROM locations ORDER BY created_at
) TO '/tmp/locations_export.csv' WITH CSV HEADER;

-- A7. Export payment_settings (if needed)
COPY (
    SELECT * FROM payment_settings ORDER BY created_at
) TO '/tmp/payment_settings_export.csv' WITH CSV HEADER;


-- ============================================================
-- SECTION B: TARGET DATABASE - Reset (Clean Slate)
-- ============================================================
-- Ye queries TARGET database pe run karo

-- B1. Disable FK constraints temporarily
SET session_replication_role = 'replica';

-- B2. Preserve settings
UPDATE settings SET profile_id = NULL WHERE profile_id IS NOT NULL;

-- B3. Delete all user-related data
DELETE FROM group_status_audit;
DELETE FROM order_activities;
DELETE FROM alert_history;
DELETE FROM pharmacy_invitation_audit;
DELETE FROM credit_penalty_history;
DELETE FROM group_commission_history;
DELETE FROM terms_acceptance_history;
DELETE FROM account_transactions;
DELETE FROM ach_transactions;
DELETE FROM payment_transactions;
DELETE FROM credit_payments;
DELETE FROM payment_adjustments;
DELETE FROM refunds;
DELETE FROM payment_reconciliation_batches;
DELETE FROM saved_payment_methods;
DELETE FROM payment_settings;
DELETE FROM credit_applications;
DELETE FROM credit_invoices;
DELETE FROM credit_memo_applications;
DELETE FROM credit_memos;
DELETE FROM user_credit_lines;
DELETE FROM sent_credit_terms;
DELETE FROM invoices;
DELETE FROM orders;
DELETE FROM reward_redemptions;
DELETE FROM reward_transactions;
DELETE FROM customer_documents;
DELETE FROM customer_notes;
DELETE FROM customer_tasks;
DELETE FROM customers;
DELETE FROM abandoned_carts;
DELETE FROM carts;
DELETE FROM locations;
DELETE FROM addresses;
DELETE FROM product_reviews;
DELETE FROM review_helpful;
DELETE FROM product_batches;
DELETE FROM cycle_counts;
DELETE FROM stock_adjustments;
DELETE FROM stock_transfers;
DELETE FROM batch_movements;
DELETE FROM expiry_alerts;
DELETE FROM notifications;
DELETE FROM email_subscribers;
DELETE FROM alerts;
DELETE FROM user_preferences;
DELETE FROM saved_searches;
DELETE FROM search_history;
DELETE FROM custom_dashboards;
DELETE FROM automation_executions;
DELETE FROM automation_rules;
DELETE FROM group_staff;
DELETE FROM pharmacy_invitations;
DELETE FROM referrals;
DELETE FROM ach_authorization_details;
DELETE FROM terms_documents;
DELETE FROM password_reset_requests;
DELETE FROM launch_password_resets;
DELETE FROM quickbooks_tokens;
DELETE FROM inventory_transactions;

-- B4. Delete profiles (nullify self-reference first)
UPDATE profiles SET referred_by = NULL WHERE referred_by IS NOT NULL;
DELETE FROM profiles;

-- B5. Delete auth tables
DELETE FROM auth.refresh_tokens;
DELETE FROM auth.sessions;
DELETE FROM auth.identities;
DELETE FROM auth.users;

-- B6. Re-enable FK constraints
SET session_replication_role = 'origin';

-- B7. Verify deletion
SELECT 
    'auth.users' as table_name, COUNT(*) as count FROM auth.users
UNION ALL
SELECT 'auth.identities', COUNT(*) FROM auth.identities
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'customers', COUNT(*) FROM customers
UNION ALL
SELECT 'settings (should be 1)', COUNT(*) FROM settings;

-- Expected: All 0 except settings = 1


-- ============================================================
-- SECTION C: TARGET DATABASE - Import Data
-- ============================================================
-- Ye queries TARGET database pe run karo
-- ⚠️ CSV file paths ko apne system ke according update karo!

-- C1. Disable FK constraints
SET session_replication_role = 'replica';

-- C2. Import auth.users
COPY auth.users FROM '/path/to/auth_users_export.csv' WITH CSV HEADER;

-- C3. Import auth.identities
COPY auth.identities FROM '/path/to/auth_identities_export.csv' WITH CSV HEADER;

-- C4. Import auth.refresh_tokens (optional)
COPY auth.refresh_tokens FROM '/path/to/auth_refresh_tokens_export.csv' WITH CSV HEADER;

-- C5. Import profiles
COPY profiles FROM '/path/to/profiles_export.csv' WITH CSV HEADER;

-- C6. Import customers (if exported)
COPY customers FROM '/path/to/customers_export.csv' WITH CSV HEADER;

-- C7. Import locations (if exported)
COPY locations FROM '/path/to/locations_export.csv' WITH CSV HEADER;

-- C8. Import payment_settings (if exported)
COPY payment_settings FROM '/path/to/payment_settings_export.csv' WITH CSV HEADER;

-- C9. Fix token columns (IMPORTANT: Prevents password reset errors)
UPDATE auth.users
SET 
    confirmation_token = COALESCE(confirmation_token, ''),
    recovery_token = COALESCE(recovery_token, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    email_change_token_current = COALESCE(email_change_token_current, ''),
    reauthentication_token = COALESCE(reauthentication_token, '');

-- C10. Re-enable FK constraints
SET session_replication_role = 'origin';


-- ============================================================
-- SECTION D: TARGET DATABASE - Verify Import
-- ============================================================

-- D1. Count verification
SELECT 
    'auth.users' as table_name, COUNT(*) as count FROM auth.users
UNION ALL
SELECT 'auth.identities', COUNT(*) FROM auth.identities
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'customers', COUNT(*) FROM customers
UNION ALL
SELECT 'locations', COUNT(*) FROM locations
UNION ALL
SELECT 'payment_settings', COUNT(*) FROM payment_settings;

-- D2. Sample data check
SELECT id, email, role, type, status FROM profiles LIMIT 10;

-- D3. Admin users check
SELECT id, email, role, type FROM profiles WHERE role = 'admin';

-- D4. Auth-Profile linkage check
SELECT 
    u.id,
    u.email as auth_email,
    p.email as profile_email,
    p.role,
    p.type
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LIMIT 10;

-- D5. Find any orphaned records
-- Profiles without auth.users
SELECT id, email FROM profiles 
WHERE id NOT IN (SELECT id FROM auth.users);

-- Auth.users without profiles
SELECT id, email FROM auth.users 
WHERE id NOT IN (SELECT id FROM profiles);


-- ============================================================
-- SECTION E: POST-IMPORT - Link Admin to Settings
-- ============================================================

-- E1. Find admin user
SELECT id, email, role FROM profiles WHERE role = 'admin' LIMIT 1;

-- E2. Link to global settings (replace USER_ID)
UPDATE settings 
SET profile_id = 'PASTE_ADMIN_USER_ID_HERE'
WHERE is_global = true;

-- E3. Verify settings link
SELECT 
    s.id as settings_id,
    s.profile_id,
    p.email as admin_email,
    p.role
FROM settings s
LEFT JOIN profiles p ON s.profile_id = p.id
WHERE s.is_global = true;


-- ============================================================
-- SECTION F: TROUBLESHOOTING
-- ============================================================

-- F1. Check for duplicate emails
SELECT email, COUNT(*) as count
FROM auth.users
GROUP BY email
HAVING COUNT(*) > 1;

-- F2. Check for missing identities
SELECT u.id, u.email
FROM auth.users u
LEFT JOIN auth.identities i ON u.id = i.user_id
WHERE i.id IS NULL;

-- F3. Check FK constraint violations
SELECT 
    conname as constraint_name,
    conrelid::regclass as table_name,
    confrelid::regclass as referenced_table
FROM pg_constraint
WHERE contype = 'f'
AND confrelid::regclass::text IN ('profiles', 'users')
ORDER BY conrelid::regclass::text;

-- F4. Find tables still referencing old user IDs
SELECT 
    tc.table_name,
    kcu.column_name,
    COUNT(*) as row_count
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND kcu.referenced_table_name IN ('profiles', 'users')
GROUP BY tc.table_name, kcu.column_name
ORDER BY tc.table_name;


-- ============================================================
-- NOTES:
-- ============================================================
-- 
-- 1. CSV File Paths:
--    Windows: 'C:\\Users\\YourName\\Downloads\\file.csv'
--    Linux/Mac: '/home/username/file.csv'
--    
-- 2. Large Imports:
--    Agar bahut zyada data hai (100k+ rows), toh batches me import karo
--    
-- 3. Passwords:
--    encrypted_password already hashed hai, so users apne purane
--    passwords se login kar sakenge
--    
-- 4. Sessions:
--    refresh_tokens import karne se users ko re-login nahi karna padega
--    (optional, but recommended)
--    
-- 5. Backup:
--    Import se pehle ZAROOR backup le lo!
--    
-- ============================================================

-- ⚠️⚠️⚠️ COMPLETE DATABASE RESET - ALL TABLES ⚠️⚠️⚠️
-- This deletes from ALL 89+ tables that reference profiles
-- 
-- ⚠️ This is COMPLETELY IRREVERSIBLE!
-- ⚠️ Take a FULL BACKUP before running!

-- ==================================================================
-- COMPLETE RESET - DELETE ALL USER DATA
-- ==================================================================

-- Step 1: Nullify profile_id in settings to preserve configuration
UPDATE settings SET profile_id = NULL WHERE profile_id IS NOT NULL;

-- Step 2: Delete from all tables in correct order
-- (Tables are ordered to avoid foreign key constraint errors)

-- Audit and history tables
DELETE FROM group_status_audit;
DELETE FROM order_activities;
DELETE FROM alert_history;
DELETE FROM pharmacy_invitation_audit;
DELETE FROM credit_penalty_history;
DELETE FROM group_commission_history;
DELETE FROM terms_acceptance_history;

-- Transaction and payment tables
DELETE FROM account_transactions;
DELETE FROM ach_transactions;
DELETE FROM payment_transactions;
DELETE FROM credit_payments;
DELETE FROM payment_adjustments;
DELETE FROM refunds;
DELETE FROM payment_reconciliation_batches;
DELETE FROM saved_payment_methods;
DELETE FROM payment_settings;

-- Credit and financial tables
DELETE FROM credit_applications;
DELETE FROM credit_invoices;
DELETE FROM credit_memo_applications;
DELETE FROM credit_memos;
DELETE FROM user_credit_lines;
DELETE FROM sent_credit_terms;

-- Order and invoice tables
DELETE FROM invoices;
DELETE FROM orders;

-- Reward tables
DELETE FROM reward_redemptions;
DELETE FROM reward_transactions;

-- Customer related tables
DELETE FROM customer_documents;
DELETE FROM customer_notes;
DELETE FROM customer_tasks;
DELETE FROM customers;

-- Cart and shopping tables
DELETE FROM abandoned_carts;
DELETE FROM carts;

-- Location and address tables
DELETE FROM locations;
DELETE FROM addresses;

-- Product and inventory tables
DELETE FROM product_reviews;
DELETE FROM review_helpful;
DELETE FROM product_batches;
DELETE FROM cycle_counts;
DELETE FROM stock_adjustments;
DELETE FROM stock_transfers;
DELETE FROM batch_movements;
DELETE FROM expiry_alerts;

-- Notification and communication tables
DELETE FROM notifications;
DELETE FROM email_subscribers;
DELETE FROM alerts;

-- User preference and customization tables
DELETE FROM user_preferences;
DELETE FROM saved_searches;
DELETE FROM search_history;
DELETE FROM custom_dashboards;

-- Automation tables
DELETE FROM automation_executions;
DELETE FROM automation_rules;

-- Group and pharmacy tables
DELETE FROM group_staff;
DELETE FROM pharmacy_invitations;

-- Referral tables
DELETE FROM referrals;

-- ACH authorization tables
DELETE FROM ach_authorization_details;

-- Terms and documents
DELETE FROM terms_documents;

-- Password reset tables
DELETE FROM password_reset_requests;
DELETE FROM launch_password_resets;

-- QuickBooks integration
DELETE FROM quickbooks_tokens;

-- Inventory transactions (IMPORTANT: This was missing!)
DELETE FROM inventory_transactions;

-- Step 3: Delete profiles (this will handle self-referencing referred_by)
-- First, nullify the self-referencing foreign key
UPDATE profiles SET referred_by = NULL WHERE referred_by IS NOT NULL;
-- Now delete all profiles
DELETE FROM profiles;

-- Step 4: Delete authentication tables
DELETE FROM auth.refresh_tokens;
DELETE FROM auth.sessions;
DELETE FROM auth.identities;
DELETE FROM auth.users;

-- Settings table is preserved with NULL profile_id!


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
SELECT 'carts', COUNT(*) FROM carts
UNION ALL
SELECT 'customers', COUNT(*) FROM customers
UNION ALL
SELECT 'payment_settings', COUNT(*) FROM payment_settings
UNION ALL
SELECT 'reward_transactions', COUNT(*) FROM reward_transactions
UNION ALL
SELECT 'settings (should be 1)', COUNT(*) FROM settings;

-- All should be 0 except settings (should be 1)


-- ==================================================================
-- ALTERNATIVE: Use Disable FK Method (FASTER)
-- ==================================================================

-- If the above query is too slow, use this method:

SET session_replication_role = 'replica';

-- Nullify settings first
UPDATE settings SET profile_id = NULL;

-- Delete from all tables (order doesn't matter with FK disabled)
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
DELETE FROM inventory_transactions;  -- ⚠️ This was missing!
UPDATE profiles SET referred_by = NULL;
DELETE FROM profiles;
DELETE FROM auth.refresh_tokens;
DELETE FROM auth.sessions;
DELETE FROM auth.identities;
DELETE FROM auth.users;

SET session_replication_role = 'origin';


-- ==================================================================
-- AFTER RESET: Create New Admin User
-- ==================================================================

-- Step 1: Go to Supabase Dashboard → Authentication → Users → Add User
-- Create a new user with email and password

-- Step 2: Get the user ID from auth.users table:
-- SELECT id, email FROM auth.users;

-- Step 3: Create profile for the new admin:
/*
INSERT INTO profiles (
    id,
    email,
    first_name,
    last_name,
    type,
    role,
    status,
    created_at,
    updated_at
) VALUES (
    'PASTE_USER_ID_HERE',  -- Replace with actual user ID from auth.users
    'admin@example.com',    -- Replace with actual email
    'Admin',
    'User',
    'admin',
    'admin',
    'active',
    NOW(),
    NOW()
);
*/

-- Step 4: Link settings to new admin:
/*
UPDATE settings 
SET profile_id = 'PASTE_USER_ID_HERE'  -- Replace with actual user ID
WHERE is_global = true;
*/

-- Step 5: Login with new admin credentials and start importing data!

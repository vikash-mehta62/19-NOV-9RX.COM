-- =====================================================
-- 🔒 ADD CONSTRAINTS BACK TO DATABASE
-- =====================================================
-- These constraints were dropped during data import
-- Now we can safely add them back
-- =====================================================

-- =====================================================
-- STEP 1: CHECK CURRENT CONSTRAINTS
-- =====================================================

-- Check if constraints already exist
SELECT 
    conname as constraint_name,
    conrelid::regclass as table_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname IN (
    'profiles_credit_status_check',
    'profiles_statement_frequency_check',
    'orders_order_type_check'
)
ORDER BY conname;

-- =====================================================
-- STEP 2: VERIFY DATA BEFORE ADDING CONSTRAINTS
-- =====================================================

-- Check if any invalid data exists in profiles.credit_status
SELECT 
    'profiles.credit_status' as column_name,
    credit_status,
    COUNT(*) as count
FROM profiles
WHERE credit_status NOT IN ('good', 'warning', 'suspended', 'blocked')
GROUP BY credit_status;

-- Check if any invalid data exists in profiles.statement_frequency
SELECT 
    'profiles.statement_frequency' as column_name,
    statement_frequency,
    COUNT(*) as count
FROM profiles
WHERE statement_frequency NOT IN ('weekly', 'biweekly', 'monthly', 'quarterly')
GROUP BY statement_frequency;

-- Check if any invalid data exists in orders.order_type
SELECT 
    'orders.order_type' as column_name,
    order_type,
    COUNT(*) as count
FROM orders
WHERE order_type NOT IN ('regular', 'sales_order', 'purchase_order')
GROUP BY order_type;

-- =====================================================
-- STEP 3: FIX INVALID DATA (IF ANY)
-- =====================================================

-- Fix invalid credit_status values
UPDATE profiles
SET credit_status = 'good'
WHERE credit_status IS NULL 
   OR credit_status NOT IN ('good', 'warning', 'suspended', 'blocked');

-- Fix invalid statement_frequency values
UPDATE profiles
SET statement_frequency = 'monthly'
WHERE statement_frequency IS NULL 
   OR statement_frequency NOT IN ('weekly', 'biweekly', 'monthly', 'quarterly');

-- Fix invalid order_type values
UPDATE orders
SET order_type = 'regular'
WHERE order_type IS NULL 
   OR order_type NOT IN ('regular', 'sales_order', 'purchase_order');

-- =====================================================
-- STEP 4: ADD CONSTRAINTS BACK
-- =====================================================

-- Add constraint for profiles.credit_status
DO $
BEGIN
    -- Drop if exists (to avoid duplicate error)
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_credit_status_check;
    
    -- Add constraint
    ALTER TABLE profiles 
    ADD CONSTRAINT profiles_credit_status_check 
    CHECK (credit_status = ANY (ARRAY['good'::text, 'warning'::text, 'suspended'::text, 'blocked'::text]));
    
    RAISE NOTICE '✅ Added constraint: profiles_credit_status_check';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️  Error adding profiles_credit_status_check: %', SQLERRM;
END $;

-- Add constraint for profiles.statement_frequency
DO $
BEGIN
    -- Drop if exists
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_statement_frequency_check;
    
    -- Add constraint
    ALTER TABLE profiles 
    ADD CONSTRAINT profiles_statement_frequency_check 
    CHECK (statement_frequency = ANY (ARRAY['weekly'::text, 'biweekly'::text, 'monthly'::text, 'quarterly'::text]));
    
    RAISE NOTICE '✅ Added constraint: profiles_statement_frequency_check';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️  Error adding profiles_statement_frequency_check: %', SQLERRM;
END $;

-- Add constraint for orders.order_type
DO $
BEGIN
    -- Drop if exists
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_type_check;
    
    -- Add constraint
    ALTER TABLE orders 
    ADD CONSTRAINT orders_order_type_check 
    CHECK (order_type = ANY (ARRAY['regular'::text, 'sales_order'::text, 'purchase_order'::text]));
    
    RAISE NOTICE '✅ Added constraint: orders_order_type_check';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️  Error adding orders_order_type_check: %', SQLERRM;
END $;

-- =====================================================
-- STEP 5: VERIFY CONSTRAINTS WERE ADDED
-- =====================================================

SELECT 
    '✅ CONSTRAINTS ADDED SUCCESSFULLY' as status,
    conname as constraint_name,
    conrelid::regclass as table_name,
    CASE 
        WHEN conname LIKE '%credit_status%' THEN '✅ Credit Status'
        WHEN conname LIKE '%statement_frequency%' THEN '✅ Statement Frequency'
        WHEN conname LIKE '%order_type%' THEN '✅ Order Type'
    END as constraint_type
FROM pg_constraint
WHERE conname IN (
    'profiles_credit_status_check',
    'profiles_statement_frequency_check',
    'orders_order_type_check'
)
ORDER BY conname;

-- =====================================================
-- STEP 6: TEST CONSTRAINTS
-- =====================================================

-- Test 1: Try to insert invalid credit_status (should fail)
DO $
BEGIN
    INSERT INTO profiles (id, credit_status, statement_frequency)
    VALUES (gen_random_uuid(), 'invalid_status', 'monthly');
    
    RAISE NOTICE '❌ TEST FAILED: Invalid data was inserted!';
EXCEPTION
    WHEN check_violation THEN
        RAISE NOTICE '✅ TEST PASSED: Constraint is working (invalid data rejected)';
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️  TEST ERROR: %', SQLERRM;
END $;

-- =====================================================
-- FINAL SUMMARY
-- =====================================================

DO $
DECLARE
    constraint_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO constraint_count
    FROM pg_constraint
    WHERE conname IN (
        'profiles_credit_status_check',
        'profiles_statement_frequency_check',
        'orders_order_type_check'
    );
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 FINAL REPORT';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'Constraints Added: % / 3', constraint_count;
    RAISE NOTICE '';
    
    IF constraint_count = 3 THEN
        RAISE NOTICE '✅ ALL CONSTRAINTS ADDED SUCCESSFULLY!';
        RAISE NOTICE '';
        RAISE NOTICE 'Your database now has:';
        RAISE NOTICE '  ✅ profiles.credit_status constraint';
        RAISE NOTICE '  ✅ profiles.statement_frequency constraint';
        RAISE NOTICE '  ✅ orders.order_type constraint';
        RAISE NOTICE '';
        RAISE NOTICE 'Invalid data will be rejected automatically.';
    ELSE
        RAISE WARNING '⚠️  Only % constraints were added', constraint_count;
        RAISE WARNING 'Check the logs above for errors';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $;

-- =====================================================
-- 📋 WHAT THIS SCRIPT DOES
-- =====================================================

/*
✅ SAFE OPERATIONS:
1. Checks if constraints already exist
2. Verifies data is valid before adding constraints
3. Fixes any invalid data automatically
4. Adds constraints back safely
5. Tests constraints are working
6. Shows final report

🔒 CONSTRAINTS BEING ADDED:

1. profiles_credit_status_check
   - Allowed values: 'good', 'warning', 'suspended', 'blocked'
   - Default: 'good'

2. profiles_statement_frequency_check
   - Allowed values: 'weekly', 'biweekly', 'monthly', 'quarterly'
   - Default: 'monthly'

3. orders_order_type_check
   - Allowed values: 'regular', 'sales_order', 'purchase_order'
   - Default: 'regular'

⚠️ IMPORTANT:
- Script will fix invalid data before adding constraints
- If data can't be fixed, constraint won't be added
- Safe to run multiple times
- No data will be deleted

🚀 HOW TO USE:
1. Copy this entire script
2. Go to Supabase Dashboard → SQL Editor
3. Paste and click "Run"
4. Check the results
5. Verify constraints are working

💡 HINDI EXPLANATION:
Ye script un constraints ko wapas add karega jo aapne
data import karte waqt drop kiye the.

Pehle ye check karega ki data valid hai ya nahi.
Agar invalid data hai to use fix kar dega.
Phir constraints add kar dega.

Safe hai - koi data delete nahi hoga.
*/


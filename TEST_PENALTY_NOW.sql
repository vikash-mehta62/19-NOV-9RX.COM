-- =====================================================
-- QUICK TEST SCRIPT - Simple Monthly Penalty System
-- =====================================================
-- Run this script to test the penalty system immediately
-- Safe to run multiple times
-- =====================================================

-- =====================================================
-- STEP 1: VERIFY SYSTEM INSTALLATION
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'STEP 1: Verifying System Installation';
  RAISE NOTICE '==============================================';
END $$;

-- Check cron job
SELECT 
  CASE 
    WHEN EXISTS(SELECT 1 FROM cron.job WHERE jobname = 'simple_monthly_penalties')
    THEN '✅ Cron job exists'
    ELSE '❌ Cron job missing'
  END as cron_status;

-- Check trigger
SELECT 
  CASE 
    WHEN EXISTS(SELECT 1 FROM pg_trigger WHERE tgname = 'track_usage_month_trigger')
    THEN '✅ Trigger exists'
    ELSE '❌ Trigger missing'
  END as trigger_status;

-- Check function
SELECT 
  CASE 
    WHEN EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'apply_simple_monthly_penalties')
    THEN '✅ Function exists'
    ELSE '❌ Function missing'
  END as function_status;

-- Check table
SELECT 
  CASE 
    WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'simple_penalty_logs')
    THEN '✅ Table exists'
    ELSE '❌ Table missing'
  END as table_status;

-- =====================================================
-- STEP 2: CHECK CURRENT STATE
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'STEP 2: Current System State';
  RAISE NOTICE '==============================================';
END $$;

-- Count users with outstanding balance
SELECT 
  COUNT(*) as users_with_balance,
  SUM(credit_used) as total_credit_used,
  SUM(credit_penalty) as total_penalties
FROM profiles
WHERE credit_used > 0;

-- Show users eligible for penalty
SELECT 
  email,
  company_name,
  credit_used,
  credit_penalty,
  credit_usage_month,
  last_penalty_month,
  late_payment_fee_percentage
FROM profiles
WHERE credit_used > 0
  AND credit_usage_month IS NOT NULL
ORDER BY credit_used DESC
LIMIT 5;

-- =====================================================
-- STEP 3: RUN PENALTY CALCULATION
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'STEP 3: Running Penalty Calculation';
  RAISE NOTICE '==============================================';
END $$;

-- Run the penalty calculation
SELECT trigger_simple_penalties_now();

-- =====================================================
-- STEP 4: VIEW RESULTS
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'STEP 4: Penalty Calculation Results';
  RAISE NOTICE '==============================================';
END $$;

-- Show latest penalty log
SELECT 
  run_date,
  to_char(run_date, 'Month DD, YYYY') as formatted_date,
  CASE run_month
    WHEN 1 THEN 'January'
    WHEN 2 THEN 'February'
    WHEN 3 THEN 'March'
    WHEN 4 THEN 'April'
    WHEN 5 THEN 'May'
    WHEN 6 THEN 'June'
    WHEN 7 THEN 'July'
    WHEN 8 THEN 'August'
    WHEN 9 THEN 'September'
    WHEN 10 THEN 'October'
    WHEN 11 THEN 'November'
    WHEN 12 THEN 'December'
  END as month_name,
  users_processed,
  penalties_applied,
  total_penalty_amount,
  status,
  execution_time_ms
FROM simple_penalty_logs
ORDER BY run_date DESC
LIMIT 1;

-- Show users who got penalties
SELECT 
  email,
  company_name,
  credit_used,
  credit_penalty,
  credit_usage_month,
  last_penalty_month,
  (credit_used + credit_penalty) as total_outstanding
FROM profiles
WHERE credit_penalty > 0
ORDER BY credit_penalty DESC
LIMIT 10;

-- =====================================================
-- STEP 5: DETAILED BREAKDOWN
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'STEP 5: Detailed Breakdown';
  RAISE NOTICE '==============================================';
END $$;

-- Summary by usage month
SELECT 
  credit_usage_month,
  CASE credit_usage_month
    WHEN 1 THEN 'January'
    WHEN 2 THEN 'February'
    WHEN 3 THEN 'March'
    WHEN 4 THEN 'April'
    WHEN 5 THEN 'May'
    WHEN 6 THEN 'June'
    WHEN 7 THEN 'July'
    WHEN 8 THEN 'August'
    WHEN 9 THEN 'September'
    WHEN 10 THEN 'October'
    WHEN 11 THEN 'November'
    WHEN 12 THEN 'December'
  END as month_name,
  COUNT(*) as user_count,
  SUM(credit_used) as total_credit,
  SUM(credit_penalty) as total_penalty,
  SUM(credit_used + credit_penalty) as total_outstanding
FROM profiles
WHERE credit_used > 0
GROUP BY credit_usage_month
ORDER BY credit_usage_month;

-- =====================================================
-- OPTIONAL: CREATE TEST USER
-- =====================================================
-- Uncomment to create a test user with outstanding balance

/*
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Creating Test User';
  RAISE NOTICE '==============================================';
END $$;

-- Find or create test user
INSERT INTO profiles (
  id,
  email,
  company_name,
  credit_limit,
  credit_used,
  credit_penalty,
  credit_usage_month,
  last_penalty_month,
  late_payment_fee_percentage
) VALUES (
  gen_random_uuid(),
  'test.penalty@example.com',
  'Test Penalty Company',
  5000.00,
  144.65,
  0,
  3,  -- March
  NULL,
  3.00
)
ON CONFLICT (email) DO UPDATE
SET 
  credit_used = 144.65,
  credit_penalty = 0,
  credit_usage_month = 3,
  last_penalty_month = NULL,
  late_payment_fee_percentage = 3.00;

-- Run penalty on test user
SELECT trigger_simple_penalties_now();

-- Check test user
SELECT 
  email,
  credit_used,
  credit_penalty,
  credit_usage_month,
  last_penalty_month,
  (credit_used + credit_penalty) as total_outstanding
FROM profiles
WHERE email = 'test.penalty@example.com';
*/

-- =====================================================
-- OPTIONAL: RESET TEST DATA
-- =====================================================
-- Uncomment to reset test user

/*
UPDATE profiles
SET 
  credit_used = 0,
  credit_penalty = 0,
  credit_usage_month = NULL,
  last_penalty_month = NULL
WHERE email = 'test.penalty@example.com';
*/

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '✅ Test Complete!';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '1. Check the results above';
  RAISE NOTICE '2. Go to Admin Panel → Credit Management → Penalty Logs';
  RAISE NOTICE '3. Verify frontend displays correctly';
  RAISE NOTICE '';
  RAISE NOTICE 'To test again: Just run this script again!';
  RAISE NOTICE '';
END $$;

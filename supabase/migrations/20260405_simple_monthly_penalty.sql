-- =====================================================
-- SIMPLE MONTHLY PENALTY SYSTEM (Better Approach)
-- =====================================================
-- Logic: Track which month credit was used
-- Apply penalty on 1st of next month if not paid
-- No complex due dates, just month tracking
-- =====================================================

-- Add simple tracking columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS credit_penalty DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS credit_usage_month INTEGER,
ADD COLUMN IF NOT EXISTS last_penalty_month INTEGER;

COMMENT ON COLUMN profiles.credit_penalty IS 'Accumulated penalties';
COMMENT ON COLUMN profiles.credit_usage_month IS 'Month when credit was last used (1-12)';
COMMENT ON COLUMN profiles.last_penalty_month IS 'Last month when penalty was applied (1-12)';

CREATE INDEX IF NOT EXISTS idx_profiles_credit_usage ON profiles(credit_usage_month) WHERE credit_used > 0;

-- =====================================================
-- PENALTY LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS simple_penalty_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  run_date DATE NOT NULL DEFAULT CURRENT_DATE,
  run_month INTEGER NOT NULL,
  users_processed INTEGER DEFAULT 0,
  penalties_applied INTEGER DEFAULT 0,
  total_penalty_amount DECIMAL(12,2) DEFAULT 0,
  execution_time_ms INTEGER,
  status VARCHAR(20) DEFAULT 'success',
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_simple_penalty_logs_date ON simple_penalty_logs(run_date DESC);

-- =====================================================
-- TRIGGER: Track Credit Usage Month
-- =====================================================
CREATE OR REPLACE FUNCTION track_credit_usage_month()
RETURNS TRIGGER AS $$
BEGIN
  -- When credit_used increases (new order/usage)
  IF NEW.credit_used > OLD.credit_used THEN
    NEW.credit_usage_month := EXTRACT(MONTH FROM CURRENT_DATE);
  END IF;
  
  -- When credit_used becomes 0 (paid)
  IF NEW.credit_used = 0 AND OLD.credit_used > 0 THEN
    NEW.credit_penalty := 0;
    NEW.credit_usage_month := NULL;
    NEW.last_penalty_month := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS track_usage_month_trigger ON profiles;
CREATE TRIGGER track_usage_month_trigger
BEFORE UPDATE OF credit_used ON profiles
FOR EACH ROW
EXECUTE FUNCTION track_credit_usage_month();

-- =====================================================
-- SIMPLE PENALTY FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION apply_simple_monthly_penalties()
RETURNS JSONB AS $$
DECLARE
  user_record RECORD;
  penalty_rate DECIMAL(5,2);
  new_penalty DECIMAL(12,2);
  v_start_time TIMESTAMP;
  v_end_time TIMESTAMP;
  v_users_processed INTEGER := 0;
  v_penalties_applied INTEGER := 0;
  v_total_penalty_amount DECIMAL(12,2) := 0;
  v_log_id UUID;
  v_details JSONB := '[]'::JSONB;
  v_current_month INTEGER;
  v_last_month INTEGER;
BEGIN
  v_start_time := clock_timestamp();
  v_current_month := EXTRACT(MONTH FROM CURRENT_DATE);
  v_last_month := CASE 
    WHEN v_current_month = 1 THEN 12 
    ELSE v_current_month - 1 
  END;
  
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Running penalty check for month: %', v_current_month;
  RAISE NOTICE 'Checking usage from month: %', v_last_month;
  RAISE NOTICE '==============================================';
  
  -- Find users who:
  -- 1. Have outstanding balance (credit_used > 0)
  -- 2. Used credit in previous month (credit_usage_month = last_month)
  -- 3. Haven't been penalized this month yet (last_penalty_month != current_month)
  FOR user_record IN 
    SELECT 
      p.id,
      p.email,
      p.company_name,
      p.credit_used,
      p.credit_penalty,
      p.credit_usage_month,
      p.last_penalty_month,
      p.late_payment_fee_percentage
    FROM profiles p
    WHERE p.credit_used > 0
    AND p.credit_usage_month IS NOT NULL
    AND (p.last_penalty_month IS NULL OR p.last_penalty_month != v_current_month)
  LOOP
    BEGIN
      v_users_processed := v_users_processed + 1;
      
      -- Get penalty rate (default 3%)
      penalty_rate := COALESCE(user_record.late_payment_fee_percentage, 3.00);
      
      -- Calculate penalty on outstanding balance
      new_penalty := ROUND(((user_record.credit_used + COALESCE(user_record.credit_penalty, 0)) * (penalty_rate / 100)), 2);
      
      -- Update profile
      UPDATE profiles
      SET 
        credit_penalty = COALESCE(credit_penalty, 0) + new_penalty,
        last_penalty_month = v_current_month,
        updated_at = NOW()
      WHERE id = user_record.id;
      
      -- Update credit line score
      UPDATE user_credit_lines
      SET 
        payment_score = GREATEST(0, payment_score - 5),
        late_payments = late_payments + 1,
        updated_at = NOW()
      WHERE user_id = user_record.id;
      
      v_penalties_applied := v_penalties_applied + 1;
      v_total_penalty_amount := v_total_penalty_amount + new_penalty;
      
      -- Log details
      v_details := v_details || jsonb_build_object(
        'user_id', user_record.id,
        'email', user_record.email,
        'company_name', user_record.company_name,
        'credit_used', user_record.credit_used,
        'previous_penalty', COALESCE(user_record.credit_penalty, 0),
        'new_penalty', new_penalty,
        'total_penalty', COALESCE(user_record.credit_penalty, 0) + new_penalty,
        'usage_month', user_record.credit_usage_month,
        'penalty_month', v_current_month
      );
      
      RAISE NOTICE 'Applied penalty to %: $% (Usage month: %, Penalty month: %)', 
        user_record.email, 
        new_penalty,
        user_record.credit_usage_month,
        v_current_month;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error processing user %: %', user_record.email, SQLERRM;
    END;
  END LOOP;
  
  v_end_time := clock_timestamp();
  
  -- Log the calculation
  INSERT INTO simple_penalty_logs (
    run_date,
    run_month,
    users_processed,
    penalties_applied,
    total_penalty_amount,
    execution_time_ms,
    status,
    details
  ) VALUES (
    CURRENT_DATE,
    v_current_month,
    v_users_processed,
    v_penalties_applied,
    v_total_penalty_amount,
    EXTRACT(MILLISECONDS FROM (v_end_time - v_start_time))::INTEGER,
    'success',
    v_details
  ) RETURNING id INTO v_log_id;
  
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Penalty calculation complete!';
  RAISE NOTICE 'Users processed: %', v_users_processed;
  RAISE NOTICE 'Penalties applied: %', v_penalties_applied;
  RAISE NOTICE 'Total amount: $%', v_total_penalty_amount;
  RAISE NOTICE '==============================================';
  
  RETURN jsonb_build_object(
    'success', true,
    'log_id', v_log_id,
    'users_processed', v_users_processed,
    'penalties_applied', v_penalties_applied,
    'total_penalty_amount', v_total_penalty_amount
  );
  
EXCEPTION WHEN OTHERS THEN
  INSERT INTO simple_penalty_logs (
    run_date,
    run_month,
    users_processed,
    penalties_applied,
    total_penalty_amount,
    status
  ) VALUES (
    CURRENT_DATE,
    v_current_month,
    v_users_processed,
    v_penalties_applied,
    v_total_penalty_amount,
    'failed'
  );
  
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SCHEDULE CRON JOB
-- =====================================================
DO $cron_setup$
DECLARE
  existing_job_count INTEGER;
BEGIN
  -- Remove old jobs
  SELECT COUNT(*) INTO existing_job_count FROM cron.job 
  WHERE jobname IN ('billing_cycle_penalties', 'monthly_credit_penalty_simple', 'simple_monthly_penalties');
  
  IF existing_job_count > 0 THEN
    BEGIN PERFORM cron.unschedule('billing_cycle_penalties'); EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN PERFORM cron.unschedule('monthly_credit_penalty_simple'); EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN PERFORM cron.unschedule('simple_monthly_penalties'); EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
  
  -- Create new cron job
  PERFORM cron.schedule(
    'simple_monthly_penalties',
    '0 2 1 * *',
    $job$SELECT apply_simple_monthly_penalties()$job$
  );
  
  RAISE NOTICE 'Created simple_monthly_penalties cron job';
END $cron_setup$;

-- =====================================================
-- MANUAL TRIGGER
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_simple_penalties_now()
RETURNS JSONB AS $$
BEGIN
  RETURN apply_simple_monthly_penalties();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- BACKFILL EXISTING USERS
-- =====================================================
DO $$
DECLARE
  v_user RECORD;
  v_current_month INTEGER;
BEGIN
  v_current_month := EXTRACT(MONTH FROM CURRENT_DATE);
  
  RAISE NOTICE 'Backfilling credit_usage_month for existing users...';
  
  FOR v_user IN 
    SELECT id, email, credit_used
    FROM profiles
    WHERE credit_used > 0
    AND credit_usage_month IS NULL
  LOOP
    UPDATE profiles
    SET credit_usage_month = v_current_month
    WHERE id = v_user.id;
    
    RAISE NOTICE 'Set usage_month for %: month %', v_user.email, v_current_month;
  END LOOP;
END $$;

-- Grant permissions
GRANT SELECT ON simple_penalty_logs TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_simple_penalties_now() TO authenticated;

-- =====================================================
-- EXAMPLE SCENARIO
-- =====================================================
COMMENT ON FUNCTION apply_simple_monthly_penalties() IS 
'Simple Monthly Penalty System:

Example:
- March 15: Order $144.65 → credit_usage_month = 3
- April 1: Cron runs → Check usage_month = 3 (last month) → Penalty $4.34
- April 15: Another order $50 → credit_usage_month = 4 (updates to current)
- May 1: Cron runs → Check usage_month = 4 (last month) → Penalty on $194.65 + $4.34

Logic:
1. Track which month credit was used
2. On 1st of next month, apply penalty
3. No complex due dates or grace periods
4. Simple month-to-month tracking';

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $success$
BEGIN
  RAISE NOTICE '✅ Simple Monthly Penalty System installed!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 How it works:';
  RAISE NOTICE '   March usage → April 1 penalty';
  RAISE NOTICE '   April usage → May 1 penalty';
  RAISE NOTICE '   Just track the month!';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 View logs: SELECT * FROM simple_penalty_logs;';
  RAISE NOTICE '🧪 Test: SELECT trigger_simple_penalties_now();';
END $success$;

-- =====================================================
-- AUTOMATION CRON JOB SETUP
-- Runs automation checks every 15 minutes
-- =====================================================

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =====================================================
-- 1. CREATE MAIN AUTOMATION EXECUTION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION execute_automation_checks()
RETURNS void AS $$
BEGIN
  -- Check low stock alerts
  PERFORM check_low_stock_alerts();
  
  -- Check order status changes
  PERFORM check_order_status_automation();
  
  RAISE NOTICE 'Automation checks completed at %', NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. CREATE ORDER STATUS CHANGE AUTOMATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION check_order_status_automation()
RETURNS void AS $$
DECLARE
  rule_record RECORD;
  order_record RECORD;
BEGIN
  -- Get all active order_status automation rules
  FOR rule_record IN
    SELECT * FROM automation_rules
    WHERE trigger_type = 'order_status'
    AND is_active = true
    ORDER BY priority DESC
  LOOP
    -- Find orders matching the trigger conditions
    FOR order_record IN
      SELECT o.*, p.full_name
      FROM orders o
      JOIN profiles p ON p.id = o.user_id
      WHERE o.status = (rule_record.trigger_conditions->>'status')
      AND o.updated_at > NOW() - INTERVAL '15 minutes' -- Only check recent changes
    LOOP
      -- Execute action based on action_type
      IF rule_record.action_type = 'send_alert' THEN
        -- Create alert
        INSERT INTO alerts (
          alert_type_id,
          title,
          message,
          severity,
          category,
          entity_type,
          entity_id,
          metadata
        ) VALUES (
          (SELECT id FROM alert_types WHERE name = 'order_pending_approval'),
          'Order Status: ' || order_record.order_number,
          'Order #' || order_record.order_number || ' status changed to ' || order_record.status,
          'info',
          'orders',
          'order',
          order_record.id,
          jsonb_build_object(
            'order_id', order_record.id,
            'order_number', order_record.order_number,
            'status', order_record.status,
            'customer', order_record.full_name,
            'rule_name', rule_record.name
          )
        )
        ON CONFLICT DO NOTHING;
      END IF;
      
      -- Log automation execution
      INSERT INTO automation_logs (
        rule_id,
        trigger_data,
        action_taken,
        status,
        executed_at
      ) VALUES (
        rule_record.id,
        jsonb_build_object(
          'order_id', order_record.id,
          'order_number', order_record.order_number,
          'status', order_record.status
        ),
        'Alert created for order status: ' || order_record.status,
        'success',
        NOW()
      );
      
      -- Update rule trigger count
      UPDATE automation_rules
      SET trigger_count = trigger_count + 1,
          last_triggered_at = NOW()
      WHERE id = rule_record.id;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. CRON JOB MANAGEMENT FUNCTIONS
-- =====================================================

-- Function to enable/start the cron job
CREATE OR REPLACE FUNCTION enable_automation_cron()
RETURNS void AS $$
DECLARE
  system_alert_type_id UUID;
BEGIN
  -- Check if cron job already exists
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'automation-checks-every-15min') THEN
    -- Schedule new job to run every 15 minutes
    PERFORM cron.schedule(
      'automation-checks-every-15min',
      '*/15 * * * *',  -- Every 15 minutes
      $$SELECT execute_automation_checks();$$
    );
    
    -- Get system alert type
    SELECT id INTO system_alert_type_id FROM alert_types WHERE name = 'system_error' LIMIT 1;
    
    -- Create notification alert for admins
    INSERT INTO alerts (
      alert_type_id,
      title,
      message,
      severity,
      category,
      metadata
    ) VALUES (
      system_alert_type_id,
      '🤖 Automation Cron Job Activated',
      'Automation monitoring is now active. The system will check automation rules every 15 minutes.',
      'info',
      'system',
      jsonb_build_object(
        'event', 'cron_enabled',
        'schedule', 'Every 15 minutes',
        'timestamp', NOW()
      )
    );
    
    -- Create notification entry for real-time updates
    INSERT INTO notifications (
      title,
      message,
      type,
      read,
      created_at
    ) VALUES (
      'Automation Cron Activated',
      'Automation monitoring is now active. The system will check automation rules every 15 minutes.',
      'system',
      false,
      NOW()
    );
    
    RAISE NOTICE 'Automation cron job enabled';
  ELSE
    RAISE NOTICE 'Automation cron job already exists';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to disable/stop the cron job
CREATE OR REPLACE FUNCTION disable_automation_cron()
RETURNS void AS $$
DECLARE
  system_alert_type_id UUID;
BEGIN
  -- Remove cron job if it exists
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'automation-checks-every-15min') THEN
    PERFORM cron.unschedule('automation-checks-every-15min');
    
    -- Get system alert type
    SELECT id INTO system_alert_type_id FROM alert_types WHERE name = 'system_error' LIMIT 1;
    
    -- Create notification alert for admins
    INSERT INTO alerts (
      alert_type_id,
      title,
      message,
      severity,
      category,
      metadata
    ) VALUES (
      system_alert_type_id,
      '⏸️ Automation Cron Job Deactivated',
      'Automation monitoring has been stopped. No active automation rules remain.',
      'warning',
      'system',
      jsonb_build_object(
        'event', 'cron_disabled',
        'reason', 'No active automation rules',
        'timestamp', NOW()
      )
    );
    
    -- Create notification entry for real-time updates
    INSERT INTO notifications (
      title,
      message,
      type,
      read,
      created_at
    ) VALUES (
      'Automation Cron Deactivated',
      'Automation monitoring has been stopped. No active automation rules remain.',
      'system',
      false,
      NOW()
    );
    
    RAISE NOTICE 'Automation cron job disabled';
  ELSE
    RAISE NOTICE 'Automation cron job does not exist';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if cron job is active
CREATE OR REPLACE FUNCTION is_automation_cron_active()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'automation-checks-every-15min');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. TRIGGER TO AUTO-ENABLE CRON ON FIRST RULE CREATION
-- =====================================================

CREATE OR REPLACE FUNCTION auto_enable_cron_on_rule_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is the first active automation rule
  IF (SELECT COUNT(*) FROM automation_rules WHERE is_active = true) = 1 THEN
    -- Enable cron job automatically
    PERFORM enable_automation_cron();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_auto_enable_cron ON automation_rules;

-- Create trigger on automation_rules table
CREATE TRIGGER trigger_auto_enable_cron
  AFTER INSERT OR UPDATE OF is_active ON automation_rules
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION auto_enable_cron_on_rule_creation();

-- =====================================================
-- 5. TRIGGER TO AUTO-DISABLE CRON WHEN NO ACTIVE RULES
-- =====================================================

CREATE OR REPLACE FUNCTION auto_disable_cron_on_no_rules()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if there are no active automation rules
  IF (SELECT COUNT(*) FROM automation_rules WHERE is_active = true) = 0 THEN
    -- Disable cron job automatically
    PERFORM disable_automation_cron();
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_auto_disable_cron ON automation_rules;

-- Create trigger on automation_rules table
CREATE TRIGGER trigger_auto_disable_cron
  AFTER DELETE OR UPDATE OF is_active ON automation_rules
  FOR EACH ROW
  WHEN (OLD.is_active = true)
  EXECUTE FUNCTION auto_disable_cron_on_no_rules();

-- =====================================================
-- 6. VERIFY CRON JOB STATUS
-- =====================================================

-- View scheduled jobs
-- SELECT * FROM cron.job WHERE jobname = 'automation-checks-every-15min';

-- Check if cron is active
-- SELECT is_automation_cron_active();

-- =====================================================
-- 7. MANUAL CRON MANAGEMENT (Optional)
-- =====================================================

-- Manually enable cron job:
-- SELECT enable_automation_cron();

-- Manually disable cron job:
-- SELECT disable_automation_cron();

-- =====================================================
-- 8. MANUAL EXECUTION (for testing)
-- =====================================================

-- You can manually run this to test:
-- SELECT execute_automation_checks();

-- =====================================================
-- NOTES
-- =====================================================

-- Cron Schedule Format: */15 * * * *
-- ┌───────────── minute (0-59) - */15 means every 15 minutes
-- │ ┌─────────── hour (0-23)
-- │ │ ┌───────── day of month (1-31)
-- │ │ │ ┌─────── month (1-12)
-- │ │ │ │ ┌───── day of week (0-7, 0 and 7 are Sunday)
-- │ │ │ │ │
-- * * * * *

-- To check cron job execution history:
-- SELECT * FROM cron.job_run_details 
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'automation-checks-every-15min')
-- ORDER BY start_time DESC LIMIT 10;

-- To unschedule (stop) the cron job:
-- SELECT cron.unschedule('automation-checks-every-15min');

COMMENT ON FUNCTION execute_automation_checks() IS 'Main function that runs all automation checks every 15 minutes';
COMMENT ON FUNCTION check_order_status_automation() IS 'Checks order status changes and triggers configured automation rules';
COMMENT ON FUNCTION enable_automation_cron() IS 'Enables the automation cron job to run every 15 minutes';
COMMENT ON FUNCTION disable_automation_cron() IS 'Disables the automation cron job';
COMMENT ON FUNCTION is_automation_cron_active() IS 'Returns true if automation cron job is currently scheduled';

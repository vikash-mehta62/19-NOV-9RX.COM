-- =====================================================
-- AUTOMATION LOGS TABLE & CRON JOB SYSTEM
-- =====================================================

-- 1. Create automation_logs table
CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES automation_rules(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL,
  trigger_data JSONB,
  action_taken TEXT NOT NULL,
  action_result TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  error_message TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_automation_logs_rule_id ON automation_logs(rule_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_executed_at ON automation_logs(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_logs_status ON automation_logs(status);

-- Add comments
COMMENT ON TABLE automation_logs IS 'Logs of automation rule executions and auto-reorder triggers';
COMMENT ON COLUMN automation_logs.rule_id IS 'Reference to automation rule (nullable for auto-reorder logs)';
COMMENT ON COLUMN automation_logs.trigger_type IS 'Type of trigger that caused this log entry';
COMMENT ON COLUMN automation_logs.action_taken IS 'Description of action performed';
COMMENT ON COLUMN automation_logs.status IS 'Execution status: success, failed, or pending';

-- =====================================================
-- 2. RLS POLICIES FOR AUTOMATION_LOGS
-- =====================================================

ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

-- Admin can view all logs
CREATE POLICY "Admins can view all automation logs"
  ON automation_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- System can insert logs (for automation execution)
CREATE POLICY "System can insert automation logs"
  ON automation_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Admin can delete old logs
CREATE POLICY "Admins can delete automation logs"
  ON automation_logs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- 3. FUNCTION TO EXECUTE ALL AUTOMATION CHECKS
-- =====================================================

CREATE OR REPLACE FUNCTION execute_automation_checks()
RETURNS void AS $$
BEGIN
  PERFORM check_low_stock_alerts();
  PERFORM check_high_value_orders();
  PERFORM trigger_auto_reorder();
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail
  RAISE WARNING 'Automation check error: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. FUNCTION TO MANAGE AUTOMATION CRON JOB
-- =====================================================

CREATE OR REPLACE FUNCTION manage_automation_cron_job()
RETURNS void AS $$
DECLARE
  active_rules_count INTEGER;
  active_reorder_count INTEGER;
  existing_job_count INTEGER;
  job_id BIGINT;
BEGIN
  -- Count active automation rules
  SELECT COUNT(*) INTO active_rules_count
  FROM automation_rules
  WHERE is_active = true;

  -- Count active auto-reorder configs
  SELECT COUNT(*) INTO active_reorder_count
  FROM auto_reorder_config
  WHERE is_enabled = true;

  -- Check if cron job exists
  SELECT COUNT(*), MAX(jobid) INTO existing_job_count, job_id
  FROM cron.job
  WHERE jobname = 'automation_monitor';

  -- If there are active rules or configs, ensure cron job exists
  IF (active_rules_count > 0 OR active_reorder_count > 0) THEN
    IF existing_job_count = 0 THEN
      -- Create new cron job (runs every 15 minutes)
      PERFORM cron.schedule(
        'automation_monitor',
        '*/15 * * * *',
        'SELECT execute_automation_checks();'
      );
      
      -- Create alert for cron job activation
      INSERT INTO alerts (
        alert_type_id,
        title,
        message,
        severity,
        category
      )
      SELECT
        (SELECT id FROM alert_types WHERE name = 'system_notification'),
        '🤖 Automation Cron Job Activated',
        'Automation monitoring is now active. The system will check automation rules every 15 minutes.',
        'info',
        'system';
    END IF;
  ELSE
    -- No active rules or configs, remove cron job if it exists
    IF existing_job_count > 0 THEN
      PERFORM cron.unschedule(job_id);
      
      -- Create alert for cron job deactivation
      INSERT INTO alerts (
        alert_type_id,
        title,
        message,
        severity,
        category
      )
      SELECT
        (SELECT id FROM alert_types WHERE name = 'system_notification'),
        '⏸️ Automation Cron Job Deactivated',
        'Automation monitoring has been stopped. No active automation rules remain.',
        'warning',
        'system';
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. TRIGGERS TO AUTO-MANAGE CRON JOB
-- =====================================================

-- Trigger for automation_rules changes
CREATE OR REPLACE FUNCTION trigger_manage_automation_cron()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM manage_automation_cron_job();
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS automation_rules_cron_trigger ON automation_rules;
DROP TRIGGER IF EXISTS auto_reorder_config_cron_trigger ON auto_reorder_config;

-- Create triggers
CREATE TRIGGER automation_rules_cron_trigger
  AFTER INSERT OR UPDATE OR DELETE ON automation_rules
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_manage_automation_cron();

CREATE TRIGGER auto_reorder_config_cron_trigger
  AFTER INSERT OR UPDATE OR DELETE ON auto_reorder_config
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_manage_automation_cron();

-- =====================================================
-- 6. ENHANCED AUTOMATION FUNCTIONS WITH LOGGING
-- =====================================================

-- Enhanced trigger_auto_reorder with logging
CREATE OR REPLACE FUNCTION trigger_auto_reorder()
RETURNS void AS $$
DECLARE
  config_record RECORD;
  log_id UUID;
BEGIN
  FOR config_record IN
    SELECT arc.*, p.name, p.current_stock
    FROM auto_reorder_config arc
    JOIN products p ON p.id = arc.product_id
    WHERE arc.is_enabled = true
    AND p.current_stock <= arc.reorder_point
  LOOP
    -- Create log entry
    INSERT INTO automation_logs (
      rule_id,
      trigger_type,
      trigger_data,
      action_taken,
      status
    )
    VALUES (
      NULL, -- No rule_id for auto-reorder
      'auto_reorder',
      jsonb_build_object(
        'product_id', config_record.product_id,
        'product_name', config_record.name,
        'current_stock', config_record.current_stock,
        'reorder_point', config_record.reorder_point,
        'reorder_quantity', config_record.reorder_quantity
      ),
      'Auto-reorder triggered for ' || config_record.name,
      'success'
    )
    RETURNING id INTO log_id;

    -- Update last reorder date
    UPDATE auto_reorder_config
    SET last_reorder_date = NOW()
    WHERE id = config_record.id;
    
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
    )
    SELECT
      (SELECT id FROM alert_types WHERE name = 'auto_reorder_triggered'),
      '🔄 Auto-Reorder: ' || config_record.name,
      'Automatic reorder of ' || config_record.reorder_quantity || ' units triggered for ' || config_record.name || '. Current stock: ' || config_record.current_stock,
      'info',
      'inventory',
      'product',
      config_record.product_id,
      jsonb_build_object(
        'product_id', config_record.product_id,
        'reorder_quantity', config_record.reorder_quantity,
        'current_stock', config_record.current_stock,
        'log_id', log_id
      );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced check_low_stock_alerts with logging
CREATE OR REPLACE FUNCTION check_low_stock_alerts()
RETURNS void AS $$
DECLARE
  rule_record RECORD;
  product_record RECORD;
  log_id UUID;
BEGIN
  -- Get active low stock rules
  FOR rule_record IN
    SELECT * FROM automation_rules
    WHERE is_active = true
    AND trigger_type = 'low_stock'
  LOOP
    -- Find products below threshold
    FOR product_record IN
      SELECT id, name, current_stock
      FROM products
      WHERE current_stock <= COALESCE((rule_record.trigger_conditions->>'threshold')::INTEGER, 10)
      AND current_stock > 0
    LOOP
      -- Check if alert already exists for this product (within last 24 hours)
      IF NOT EXISTS (
        SELECT 1 FROM alerts
        WHERE entity_type = 'product'
        AND entity_id = product_record.id
        AND category = 'inventory'
        AND created_at > NOW() - INTERVAL '24 hours'
        AND is_resolved = false
      ) THEN
        -- Create log entry
        INSERT INTO automation_logs (
          rule_id,
          trigger_type,
          trigger_data,
          action_taken,
          status
        )
        VALUES (
          rule_record.id,
          'low_stock',
          jsonb_build_object(
            'product_id', product_record.id,
            'product_name', product_record.name,
            'current_stock', product_record.current_stock,
            'threshold', rule_record.trigger_conditions->>'threshold'
          ),
          'Low stock alert created for ' || product_record.name,
          'success'
        )
        RETURNING id INTO log_id;

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
        )
        SELECT
          (SELECT id FROM alert_types WHERE name = 'low_stock'),
          '⚠️ Low Stock: ' || product_record.name,
          'Stock level is critically low (' || product_record.current_stock || ' units remaining). Consider reordering soon.',
          'warning',
          'inventory',
          'product',
          product_record.id,
          jsonb_build_object(
            'current_stock', product_record.current_stock,
            'threshold', rule_record.trigger_conditions->>'threshold',
            'rule_id', rule_record.id,
            'log_id', log_id
          );

        -- Update rule trigger count
        UPDATE automation_rules
        SET 
          trigger_count = trigger_count + 1,
          last_triggered_at = NOW()
        WHERE id = rule_record.id;
      END IF;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. INITIALIZE CRON JOB IF NEEDED
-- =====================================================

-- Run the management function to set up cron job if there are active rules/configs
SELECT manage_automation_cron_job();;

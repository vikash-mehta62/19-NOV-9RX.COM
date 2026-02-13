-- =====================================================
-- AUTOMATION SYSTEM MIGRATION
-- Week 5-6: Alert System, Workflow Automation, Bulk Operations
-- =====================================================

-- =====================================================
-- 1. ALERT SYSTEM
-- =====================================================

-- Alert Types Table
CREATE TABLE IF NOT EXISTS alert_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT NOT NULL, -- 'inventory', 'orders', 'customers', 'system'
  severity TEXT NOT NULL DEFAULT 'info', -- 'critical', 'warning', 'info'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts Table
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type_id UUID REFERENCES alert_types(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  category TEXT NOT NULL,
  entity_type TEXT, -- 'product', 'order', 'customer', etc.
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Alert Subscriptions (who gets notified)
CREATE TABLE IF NOT EXISTS alert_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  alert_type_id UUID REFERENCES alert_types(id) ON DELETE CASCADE,
  notification_method TEXT[] DEFAULT ARRAY['in_app'], -- 'in_app', 'email', 'sms'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, alert_type_id)
);

-- Alert History (for audit trail)
CREATE TABLE IF NOT EXISTS alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID REFERENCES alerts(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'created', 'read', 'resolved', 'dismissed'
  performed_by UUID REFERENCES profiles(id),
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- =====================================================
-- 2. WORKFLOW AUTOMATION
-- =====================================================

-- Automation Rules Table
CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL, -- 'low_stock', 'high_value_order', 'order_status', 'time_based'
  trigger_conditions JSONB NOT NULL, -- conditions to trigger the rule
  action_type TEXT NOT NULL, -- 'auto_approve', 'auto_reorder', 'send_alert', 'update_status'
  action_config JSONB NOT NULL, -- configuration for the action
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automation Execution Log
CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES automation_rules(id) ON DELETE CASCADE,
  trigger_data JSONB,
  action_taken TEXT,
  status TEXT NOT NULL, -- 'success', 'failed', 'skipped'
  error_message TEXT,
  execution_time_ms INTEGER,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-Reorder Configuration
CREATE TABLE IF NOT EXISTS auto_reorder_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE UNIQUE,
  is_enabled BOOLEAN DEFAULT false,
  reorder_point INTEGER NOT NULL, -- stock level to trigger reorder
  reorder_quantity INTEGER NOT NULL, -- how much to order
  supplier_id UUID, -- optional supplier reference
  lead_time_days INTEGER DEFAULT 7,
  last_reorder_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. BULK OPERATIONS
-- =====================================================

-- Bulk Operation Jobs
CREATE TABLE IF NOT EXISTS bulk_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type TEXT NOT NULL, -- 'update_prices', 'update_stock', 'update_status', 'delete', 'export'
  entity_type TEXT NOT NULL, -- 'products', 'orders', 'customers'
  total_items INTEGER NOT NULL,
  processed_items INTEGER DEFAULT 0,
  successful_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'cancelled'
  operation_data JSONB NOT NULL, -- data for the operation
  result_data JSONB DEFAULT '{}', -- results and errors
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_category ON alerts(category);
CREATE INDEX IF NOT EXISTS idx_alerts_is_read ON alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_entity ON alerts(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_automation_rules_trigger ON automation_rules(trigger_type);
CREATE INDEX IF NOT EXISTS idx_automation_rules_active ON automation_rules(is_active);

CREATE INDEX IF NOT EXISTS idx_automation_logs_rule ON automation_logs(rule_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_executed ON automation_logs(executed_at DESC);

CREATE INDEX IF NOT EXISTS idx_bulk_operations_status ON bulk_operations(status);
CREATE INDEX IF NOT EXISTS idx_bulk_operations_created ON bulk_operations(created_at DESC);

-- =====================================================
-- 5. INSERT DEFAULT ALERT TYPES
-- =====================================================

INSERT INTO alert_types (name, description, category, severity) VALUES
  ('low_stock', 'Product stock level is below threshold', 'inventory', 'warning'),
  ('out_of_stock', 'Product is completely out of stock', 'inventory', 'critical'),
  ('high_value_order', 'Order value exceeds threshold', 'orders', 'info'),
  ('order_pending_approval', 'Order requires manual approval', 'orders', 'warning'),
  ('payment_failed', 'Payment processing failed', 'orders', 'critical'),
  ('new_customer', 'New customer registration', 'customers', 'info'),
  ('customer_credit_limit', 'Customer approaching credit limit', 'customers', 'warning'),
  ('system_error', 'System error occurred', 'system', 'critical'),
  ('auto_reorder_triggered', 'Automatic reorder was triggered', 'inventory', 'info'),
  ('bulk_operation_completed', 'Bulk operation finished', 'system', 'info')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 6. RLS POLICIES
-- =====================================================

-- Alerts policies
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all alerts"
  ON alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert alerts"
  ON alerts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update alerts"
  ON alerts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Automation rules policies
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage automation rules"
  ON automation_rules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Bulk operations policies
ALTER TABLE bulk_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage bulk operations"
  ON bulk_operations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- 7. FUNCTIONS FOR AUTOMATION
-- =====================================================

-- Function to check low stock and create alerts
CREATE OR REPLACE FUNCTION check_low_stock_alerts()
RETURNS void AS $$
DECLARE
  product_record RECORD;
  alert_type_id UUID;
BEGIN
  -- Get low_stock alert type
  SELECT id INTO alert_type_id FROM alert_types WHERE name = 'low_stock';
  
  -- Check all products with low stock
  FOR product_record IN
    SELECT p.id, p.name, p.stock_quantity, arc.reorder_point
    FROM products p
    LEFT JOIN auto_reorder_config arc ON arc.product_id = p.id
    WHERE p.stock_quantity <= COALESCE(arc.reorder_point, 10)
    AND p.stock_quantity > 0
  LOOP
    -- Create alert if not already exists
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
      alert_type_id,
      'Low Stock Alert: ' || product_record.name,
      'Product "' || product_record.name || '" has only ' || product_record.stock_quantity || ' units remaining.',
      'warning',
      'inventory',
      'product',
      product_record.id,
      jsonb_build_object(
        'product_id', product_record.id,
        'product_name', product_record.name,
        'current_stock', product_record.stock_quantity,
        'reorder_point', product_record.reorder_point
      )
    WHERE NOT EXISTS (
      SELECT 1 FROM alerts
      WHERE entity_type = 'product'
      AND entity_id = product_record.id
      AND is_resolved = false
      AND created_at > NOW() - INTERVAL '24 hours'
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check high-value orders
CREATE OR REPLACE FUNCTION check_high_value_orders()
RETURNS void AS $$
DECLARE
  order_record RECORD;
  alert_type_id UUID;
  threshold NUMERIC := 1000.00; -- configurable threshold
BEGIN
  SELECT id INTO alert_type_id FROM alert_types WHERE name = 'high_value_order';
  
  FOR order_record IN
    SELECT o.id, o.order_number, o.total_amount, p.full_name
    FROM orders o
    JOIN profiles p ON p.id = o.user_id
    WHERE o.total_amount >= threshold
    AND o.created_at > NOW() - INTERVAL '1 hour'
    AND o.status = 'pending'
  LOOP
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
      alert_type_id,
      'High Value Order: ' || order_record.order_number,
      'Order #' || order_record.order_number || ' from ' || order_record.full_name || ' totals $' || order_record.total_amount,
      'info',
      'orders',
      'order',
      order_record.id,
      jsonb_build_object(
        'order_id', order_record.id,
        'order_number', order_record.order_number,
        'amount', order_record.total_amount,
        'customer', order_record.full_name
      )
    WHERE NOT EXISTS (
      SELECT 1 FROM alerts
      WHERE entity_type = 'order'
      AND entity_id = order_record.id
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to trigger auto-reorder
CREATE OR REPLACE FUNCTION trigger_auto_reorder()
RETURNS void AS $$
DECLARE
  config_record RECORD;
BEGIN
  FOR config_record IN
    SELECT arc.*, p.name, p.stock_quantity
    FROM auto_reorder_config arc
    JOIN products p ON p.id = arc.product_id
    WHERE arc.is_enabled = true
    AND p.stock_quantity <= arc.reorder_point
  LOOP
    -- Log the auto-reorder trigger
    INSERT INTO automation_logs (
      rule_id,
      trigger_data,
      action_taken,
      status,
      executed_at
    ) VALUES (
      NULL, -- no specific rule, system-triggered
      jsonb_build_object(
        'product_id', config_record.product_id,
        'product_name', config_record.name,
        'current_stock', config_record.stock_quantity,
        'reorder_quantity', config_record.reorder_quantity
      ),
      'Auto-reorder triggered for ' || config_record.name,
      'success',
      NOW()
    );
    
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
      'Auto-Reorder: ' || config_record.name,
      'Automatic reorder of ' || config_record.reorder_quantity || ' units triggered for ' || config_record.name,
      'info',
      'inventory',
      'product',
      config_record.product_id,
      jsonb_build_object(
        'product_id', config_record.product_id,
        'reorder_quantity', config_record.reorder_quantity,
        'current_stock', config_record.stock_quantity
      );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. TRIGGERS
-- =====================================================

-- Trigger to check for high-value orders on insert
CREATE OR REPLACE FUNCTION check_order_value_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.total_amount >= 1000 THEN
    PERFORM check_high_value_orders();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER order_value_check_trigger
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION check_order_value_trigger();

-- Trigger to check stock levels on update
CREATE OR REPLACE FUNCTION check_stock_level_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock_quantity <= 10 AND OLD.stock_quantity > 10 THEN
    PERFORM check_low_stock_alerts();
  END IF;
  
  IF NEW.stock_quantity = 0 AND OLD.stock_quantity > 0 THEN
    INSERT INTO alerts (
      alert_type_id,
      title,
      message,
      severity,
      category,
      entity_type,
      entity_id
    ) VALUES (
      (SELECT id FROM alert_types WHERE name = 'out_of_stock'),
      'Out of Stock: ' || NEW.name,
      'Product "' || NEW.name || '" is now out of stock.',
      'critical',
      'inventory',
      'product',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stock_level_check_trigger
  AFTER UPDATE OF stock_quantity ON products
  FOR EACH ROW
  EXECUTE FUNCTION check_stock_level_trigger();

-- =====================================================
-- COMPLETE
-- =====================================================

COMMENT ON TABLE alerts IS 'System alerts for inventory, orders, and other events';
COMMENT ON TABLE automation_rules IS 'Configurable automation rules for workflow automation';
COMMENT ON TABLE bulk_operations IS 'Bulk operation jobs for batch processing';
COMMENT ON TABLE auto_reorder_config IS 'Configuration for automatic product reordering';

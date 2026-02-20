-- Function to check high-value orders and create alerts
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION check_high_value_orders()
RETURNS void AS $$
DECLARE
  order_record RECORD;
  alert_type_id UUID;
  threshold NUMERIC := 1000.00; -- configurable threshold
BEGIN
  -- Get the alert type ID for high value orders
  SELECT id INTO alert_type_id FROM alert_types WHERE name = 'high_value_order';
  
  -- If alert type doesn't exist, exit gracefully
  IF alert_type_id IS NULL THEN
    RAISE NOTICE 'Alert type "high_value_order" not found. Skipping high value order check.';
    RETURN;
  END IF;
  
  -- Check for high value orders in the last hour
  FOR order_record IN
    SELECT o.id, o.order_number, o.total_amount, p.full_name
    FROM orders o
    JOIN profiles p ON p.id = o.user_id
    WHERE o.total_amount >= threshold
    AND o.created_at > NOW() - INTERVAL '1 hour'
    AND o.status = 'pending'
  LOOP
    -- Create alert for high value order
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
    VALUES (
      alert_type_id,
      'High Value Order',
      'Order #' || order_record.order_number || ' from ' || order_record.full_name || 
      ' totaling $' || order_record.total_amount || ' requires attention',
      'high',
      'order',
      'order',
      order_record.id,
      jsonb_build_object(
        'order_id', order_record.id,
        'order_number', order_record.order_number,
        'amount', order_record.total_amount,
        'customer_name', order_record.full_name
      )
    )
    ON CONFLICT DO NOTHING; -- Prevent duplicate alerts
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_high_value_orders() TO authenticated;
GRANT EXECUTE ON FUNCTION check_high_value_orders() TO service_role;

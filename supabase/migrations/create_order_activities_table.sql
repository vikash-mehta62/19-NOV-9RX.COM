-- Create order_activities table to track all order changes
CREATE TABLE IF NOT EXISTS order_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL, -- 'created', 'updated', 'status_changed', 'payment_received', 'cancelled', 'voided', 'note_added'
  description TEXT NOT NULL,
  performed_by UUID REFERENCES profiles(id),
  performed_by_name VARCHAR(255),
  performed_by_email VARCHAR(255),
  old_data JSONB, -- Store previous state for updates
  new_data JSONB, -- Store new state for updates
  metadata JSONB, -- Additional information like payment details, status changes, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_order_activities_order_id ON order_activities(order_id);
CREATE INDEX IF NOT EXISTS idx_order_activities_created_at ON order_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_activities_type ON order_activities(activity_type);

-- Enable RLS
ALTER TABLE order_activities ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated users to view order activities"
  ON order_activities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert order activities"
  ON order_activities FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create function to automatically log order creation
CREATE OR REPLACE FUNCTION log_order_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO order_activities (
    order_id,
    activity_type,
    description,
    performed_by,
    performed_by_name,
    performed_by_email,
    new_data,
    metadata
  ) VALUES (
    NEW.id,
    'created',
    'Order created',
    NEW.profile_id,
    COALESCE(NEW.customerInfo->>'name', 'Unknown'),
    COALESCE(NEW.customerInfo->>'email', ''),
    to_jsonb(NEW),
    jsonb_build_object(
      'order_number', NEW.order_number,
      'total_amount', NEW.total_amount,
      'status', NEW.status,
      'payment_method', NEW.payment_method
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for order creation
DROP TRIGGER IF EXISTS trigger_log_order_creation ON orders;
CREATE TRIGGER trigger_log_order_creation
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION log_order_creation();

-- Create function to log order updates
CREATE OR REPLACE FUNCTION log_order_update()
RETURNS TRIGGER AS $$
DECLARE
  activity_desc TEXT;
  activity_type_val VARCHAR(50);
BEGIN
  -- Determine what changed
  IF OLD.status != NEW.status THEN
    activity_type_val := 'status_changed';
    activity_desc := 'Order status changed from "' || OLD.status || '" to "' || NEW.status || '"';
  ELSIF OLD.payment_status != NEW.payment_status THEN
    activity_type_val := 'payment_updated';
    activity_desc := 'Payment status changed from "' || OLD.payment_status || '" to "' || NEW.payment_status || '"';
  ELSIF OLD.void != NEW.void AND NEW.void = true THEN
    activity_type_val := 'voided';
    activity_desc := 'Order voided';
  ELSE
    activity_type_val := 'updated';
    activity_desc := 'Order details updated';
  END IF;

  INSERT INTO order_activities (
    order_id,
    activity_type,
    description,
    performed_by,
    old_data,
    new_data,
    metadata
  ) VALUES (
    NEW.id,
    activity_type_val,
    activity_desc,
    NEW.profile_id,
    to_jsonb(OLD),
    to_jsonb(NEW),
    jsonb_build_object(
      'order_number', NEW.order_number,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'old_payment_status', OLD.payment_status,
      'new_payment_status', NEW.payment_status
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for order updates
DROP TRIGGER IF EXISTS trigger_log_order_update ON orders;
CREATE TRIGGER trigger_log_order_update
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION log_order_update();

nges, etc.';us cha stats,ment detaile paycontext lik'Additional etadata IS vities.mder_actiLUMN orMENT ON CO)';
COM(for updatesthe order e of stat 'New new_data ISes.r_activitiMN ordeNT ON COLU
COMMEpdates)';rder (for ute of the oPrevious sta IS 'ataities.old_dctivLUMN order_aON CO';
COMMENT te_added nooided, vcancelled,ived, ent_receanged, payms_chatupdated, stated, u: cre activityType ofty_type IS 'activiivities.N order_actCOLUM
COMMENT ON ; to orders'ges relatedhannd c aestivitiracks all ac'Tities IS activ order_ON TABLE
COMMENT 
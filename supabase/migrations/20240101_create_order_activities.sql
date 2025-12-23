-- Create order_activities table to track all order changes
CREATE TABLE IF NOT EXISTS order_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  performed_by UUID REFERENCES profiles(id),
  performed_by_name VARCHAR(255),
  performed_by_email VARCHAR(255),
  old_data JSONB,
  new_data JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_order_activities_order_id ON order_activities(order_id);
CREATE INDEX IF NOT EXISTS idx_order_activities_created_at ON order_activities(created_at DESC);
ALTER TABLE order_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to view order activities"
  ON order_activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert order activities"
  ON order_activities FOR INSERT TO authenticated WITH CHECK (true);

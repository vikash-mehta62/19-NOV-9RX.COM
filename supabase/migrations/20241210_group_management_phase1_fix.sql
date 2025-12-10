-- =====================================================
-- GROUP MANAGEMENT - PHASE 1 FIX: Missing Items
-- Date: December 10, 2024
-- Description: Add missing columns and tables from Phase 1
-- =====================================================

-- 1. Add missing auto_commission column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auto_commission BOOLEAN DEFAULT false;
COMMENT ON COLUMN profiles.auto_commission IS 'If true, commission is auto-calculated on orders';

-- 2. Add missing columns to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES profiles(id);
COMMENT ON COLUMN orders.group_id IS 'The group this pharmacy belongs to (denormalized for faster queries)';

ALTER TABLE orders ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(12,2) DEFAULT 0;
COMMENT ON COLUMN orders.commission_amount IS 'Commission amount earned by group on this order';

-- Index for group order queries
CREATE INDEX IF NOT EXISTS idx_orders_group_id ON orders(group_id);

-- 3. Add missing columns to pharmacy_invitations
ALTER TABLE pharmacy_invitations ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE pharmacy_invitations ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE pharmacy_invitations ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE pharmacy_invitations ADD COLUMN IF NOT EXISTS accepted_by UUID REFERENCES profiles(id);

-- 4. Create group_commission_history table
CREATE TABLE IF NOT EXISTS group_commission_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pharmacy_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_amount DECIMAL(12,2) NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL,
  commission_amount DECIMAL(12,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint if table was just created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_order_commission'
  ) THEN
    ALTER TABLE group_commission_history ADD CONSTRAINT unique_order_commission UNIQUE (order_id);
  END IF;
END $$;

-- Indexes for reporting
CREATE INDEX IF NOT EXISTS idx_commission_history_group_id ON group_commission_history(group_id);
CREATE INDEX IF NOT EXISTS idx_commission_history_pharmacy_id ON group_commission_history(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_commission_history_created_at ON group_commission_history(created_at);
CREATE INDEX IF NOT EXISTS idx_commission_history_status ON group_commission_history(status);

COMMENT ON TABLE group_commission_history IS 'Tracks commission earned by groups on each pharmacy order';

-- 5. Create group_analytics view
CREATE OR REPLACE VIEW group_analytics AS
SELECT 
  g.id as group_id,
  g.display_name as group_name,
  g.commission_rate,
  g.bypass_min_price,
  g.can_manage_pricing,
  COUNT(DISTINCT p.id) as total_pharmacies,
  COUNT(DISTINCT CASE WHEN p.status = 'active' THEN p.id END) as active_pharmacies,
  COUNT(DISTINCT o.id) as total_orders,
  COALESCE(SUM(o.total_amount), 0) as total_revenue,
  COALESCE(SUM(o.commission_amount), 0) as total_commission,
  COUNT(DISTINCT CASE WHEN o.created_at >= date_trunc('month', CURRENT_DATE) THEN o.id END) as orders_this_month,
  COALESCE(SUM(CASE WHEN o.created_at >= date_trunc('month', CURRENT_DATE) THEN o.total_amount ELSE 0 END), 0) as revenue_this_month
FROM profiles g
LEFT JOIN profiles p ON p.group_id = g.id AND p.type = 'pharmacy'
LEFT JOIN orders o ON o.profile_id = p.id AND o.void IS NOT TRUE
WHERE g.type = 'group'
GROUP BY g.id, g.display_name, g.commission_rate, g.bypass_min_price, g.can_manage_pricing;

COMMENT ON VIEW group_analytics IS 'Aggregated analytics for each group including pharmacy count, orders, and revenue';

-- 6. Backfill group_id in existing orders
UPDATE orders o
SET group_id = p.group_id
FROM profiles p
WHERE o.profile_id = p.id 
  AND p.group_id IS NOT NULL 
  AND o.group_id IS NULL;

-- 7. Enable RLS on group_commission_history
ALTER TABLE group_commission_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for group_commission_history
DROP POLICY IF EXISTS "Groups can view own commission" ON group_commission_history;
CREATE POLICY "Groups can view own commission" ON group_commission_history
  FOR SELECT USING (
    auth.uid() = group_id OR 
    auth.uid() = pharmacy_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admin can manage commission" ON group_commission_history;
CREATE POLICY "Admin can manage commission" ON group_commission_history
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- END OF FIX MIGRATION
-- =====================================================

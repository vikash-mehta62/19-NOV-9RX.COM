-- =====================================================
-- GROUP MANAGEMENT - PHASE 1: DATABASE CHANGES
-- Date: December 10, 2024
-- Description: Add commission tracking, group settings, and invitation system
-- =====================================================

-- =====================================================
-- 1. ADD COMMISSION TRACKING TO PROFILES
-- =====================================================

-- Commission rate for groups (percentage of order value)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 0;
COMMENT ON COLUMN profiles.commission_rate IS 'Commission percentage earned by group on pharmacy orders (0-100)';
-- Total commission earned (calculated/cached value)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_commission DECIMAL(12,2) DEFAULT 0;
COMMENT ON COLUMN profiles.total_commission IS 'Total commission earned by this group';
-- =====================================================
-- 2. ADD GROUP-SPECIFIC SETTINGS
-- =====================================================

-- Allow group to bypass minimum price restrictions
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bypass_min_price BOOLEAN DEFAULT false;
COMMENT ON COLUMN profiles.bypass_min_price IS 'If true, group can set prices below minimum cap';
-- Allow group to manage their own pricing
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS can_manage_pricing BOOLEAN DEFAULT false;
COMMENT ON COLUMN profiles.can_manage_pricing IS 'If true, group can create/edit their own price lists';
-- Group auto-commission calculation enabled
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auto_commission BOOLEAN DEFAULT false;
COMMENT ON COLUMN profiles.auto_commission IS 'If true, commission is auto-calculated on orders';
-- =====================================================
-- 3. CREATE PHARMACY INVITATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS pharmacy_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  pharmacy_name TEXT,
  contact_person TEXT,
  phone TEXT,
  message TEXT, -- Custom message from group to pharmacy
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES profiles(id), -- The pharmacy profile that accepted
  
  -- Prevent duplicate pending invitations to same email from same group
  CONSTRAINT unique_pending_invitation UNIQUE (group_id, email, status)
);
-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pharmacy_invitations_group_id ON pharmacy_invitations(group_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_invitations_token ON pharmacy_invitations(token);
CREATE INDEX IF NOT EXISTS idx_pharmacy_invitations_email ON pharmacy_invitations(email);
CREATE INDEX IF NOT EXISTS idx_pharmacy_invitations_status ON pharmacy_invitations(status);
COMMENT ON TABLE pharmacy_invitations IS 'Stores invitations sent by groups to pharmacies to join their network';
-- =====================================================
-- 4. CREATE GROUP COMMISSION HISTORY TABLE
-- =====================================================

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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One commission record per order
  CONSTRAINT unique_order_commission UNIQUE (order_id)
);
-- Indexes for reporting
CREATE INDEX IF NOT EXISTS idx_commission_history_group_id ON group_commission_history(group_id);
CREATE INDEX IF NOT EXISTS idx_commission_history_pharmacy_id ON group_commission_history(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_commission_history_created_at ON group_commission_history(created_at);
CREATE INDEX IF NOT EXISTS idx_commission_history_status ON group_commission_history(status);
COMMENT ON TABLE group_commission_history IS 'Tracks commission earned by groups on each pharmacy order';
-- =====================================================
-- 5. ADD GROUP ORDER TRACKING FIELDS TO ORDERS
-- =====================================================

-- Track which group the order belongs to (for easier querying)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES profiles(id);
COMMENT ON COLUMN orders.group_id IS 'The group this pharmacy belongs to (denormalized for faster queries)';
-- Commission amount for this specific order
ALTER TABLE orders ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(12,2) DEFAULT 0;
COMMENT ON COLUMN orders.commission_amount IS 'Commission amount earned by group on this order';
-- Index for group order queries
CREATE INDEX IF NOT EXISTS idx_orders_group_id ON orders(group_id);
-- =====================================================
-- 6. CREATE VIEW FOR GROUP ANALYTICS
-- =====================================================

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
-- =====================================================
-- 7. FUNCTION TO AUTO-CALCULATE COMMISSION ON ORDER
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_order_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_group_id UUID;
  v_commission_rate DECIMAL(5,2);
  v_commission_amount DECIMAL(12,2);
  v_auto_commission BOOLEAN;
BEGIN
  -- Get the group_id and commission rate for this pharmacy
  SELECT p.group_id, g.commission_rate, g.auto_commission
  INTO v_group_id, v_commission_rate, v_auto_commission
  FROM profiles p
  LEFT JOIN profiles g ON g.id = p.group_id
  WHERE p.id = NEW.profile_id;
  
  -- If pharmacy belongs to a group with auto_commission enabled
  IF v_group_id IS NOT NULL AND v_auto_commission = true AND v_commission_rate > 0 THEN
    v_commission_amount := (NEW.total_amount * v_commission_rate / 100);
    
    -- Update the order with group_id and commission
    NEW.group_id := v_group_id;
    NEW.commission_amount := v_commission_amount;
    
    -- Insert commission history record (only on INSERT, not UPDATE)
    IF TG_OP = 'INSERT' THEN
      INSERT INTO group_commission_history (
        group_id, pharmacy_id, order_id, order_amount, commission_rate, commission_amount
      ) VALUES (
        v_group_id, NEW.profile_id, NEW.id, NEW.total_amount, v_commission_rate, v_commission_amount
      )
      ON CONFLICT (order_id) DO UPDATE SET
        order_amount = EXCLUDED.order_amount,
        commission_rate = EXCLUDED.commission_rate,
        commission_amount = EXCLUDED.commission_amount;
    END IF;
  ELSE
    -- Just set the group_id for tracking
    NEW.group_id := v_group_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Create trigger for auto commission calculation
DROP TRIGGER IF EXISTS trigger_calculate_order_commission ON orders;
CREATE TRIGGER trigger_calculate_order_commission
  BEFORE INSERT OR UPDATE OF total_amount ON orders
  FOR EACH ROW
  EXECUTE FUNCTION calculate_order_commission();
-- =====================================================
-- 8. FUNCTION TO UPDATE GROUP TOTAL COMMISSION
-- =====================================================

CREATE OR REPLACE FUNCTION update_group_total_commission()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the group's total commission
  UPDATE profiles
  SET total_commission = (
    SELECT COALESCE(SUM(commission_amount), 0)
    FROM group_commission_history
    WHERE group_id = NEW.group_id AND status != 'cancelled'
  )
  WHERE id = NEW.group_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Create trigger to update total commission
DROP TRIGGER IF EXISTS trigger_update_group_commission ON group_commission_history;
CREATE TRIGGER trigger_update_group_commission
  AFTER INSERT OR UPDATE OR DELETE ON group_commission_history
  FOR EACH ROW
  EXECUTE FUNCTION update_group_total_commission();
-- =====================================================
-- 9. RLS POLICIES FOR NEW TABLES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE pharmacy_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_commission_history ENABLE ROW LEVEL SECURITY;
-- Pharmacy Invitations: Groups can see their own invitations
CREATE POLICY "Groups can view own invitations" ON pharmacy_invitations
  FOR SELECT USING (
    auth.uid() = group_id OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Groups can create invitations" ON pharmacy_invitations
  FOR INSERT WITH CHECK (
    auth.uid() = group_id OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Groups can update own invitations" ON pharmacy_invitations
  FOR UPDATE USING (
    auth.uid() = group_id OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
-- Commission History: Groups can see their own commission
CREATE POLICY "Groups can view own commission" ON group_commission_history
  FOR SELECT USING (
    auth.uid() = group_id OR 
    auth.uid() = pharmacy_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
-- Admin can manage all commission records
CREATE POLICY "Admin can manage commission" ON group_commission_history
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
-- =====================================================
-- 10. BACKFILL GROUP_ID IN EXISTING ORDERS
-- =====================================================

-- Update existing orders with group_id from their pharmacy's profile
UPDATE orders o
SET group_id = p.group_id
FROM profiles p
WHERE o.profile_id = p.id 
  AND p.group_id IS NOT NULL 
  AND o.group_id IS NULL;
-- =====================================================
-- END OF MIGRATION
-- =====================================================;

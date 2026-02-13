-- =====================================================
-- PHASE 1: INVENTORY MANAGEMENT FOUNDATION
-- Database Setup Script
-- =====================================================

-- =====================================================
-- PART 1: STOCK RESERVATIONS
-- =====================================================

-- Create stock reservations table
CREATE TABLE IF NOT EXISTS stock_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  reserved_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'fulfilled', 'cancelled', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_reservations_product ON stock_reservations(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_order ON stock_reservations(order_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_status ON stock_reservations(status);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_expires ON stock_reservations(expires_at) WHERE status = 'active';

-- Add reserved_stock column to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS reserved_stock NUMERIC DEFAULT 0;

-- Create function to calculate available stock
CREATE OR REPLACE FUNCTION calculate_available_stock(product_uuid UUID)
RETURNS NUMERIC AS $$
DECLARE
  current_stock_val NUMERIC;
  reserved_stock_val NUMERIC;
BEGIN
  SELECT current_stock INTO current_stock_val
  FROM products
  WHERE id = product_uuid;
  
  SELECT COALESCE(SUM(quantity), 0) INTO reserved_stock_val
  FROM stock_reservations
  WHERE product_id = product_uuid
    AND status = 'active';
  
  RETURN COALESCE(current_stock_val, 0) - COALESCE(reserved_stock_val, 0);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update reserved_stock
CREATE OR REPLACE FUNCTION update_reserved_stock()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET reserved_stock = (
    SELECT COALESCE(SUM(quantity), 0)
    FROM stock_reservations
    WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
      AND status = 'active'
  )
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_reserved_stock ON stock_reservations;
CREATE TRIGGER trigger_update_reserved_stock
AFTER INSERT OR UPDATE OR DELETE ON stock_reservations
FOR EACH ROW
EXECUTE FUNCTION update_reserved_stock();

-- Create function to expire old reservations
CREATE OR REPLACE FUNCTION expire_old_reservations()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE stock_reservations
  SET status = 'expired',
      updated_at = NOW()
  WHERE status = 'active'
    AND expires_at < NOW();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 2: BATCH/LOT TRACKING
-- =====================================================

-- Create product_batches table
CREATE TABLE IF NOT EXISTS product_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  batch_number TEXT NOT NULL,
  lot_number TEXT,
  manufacturing_date DATE,
  expiry_date DATE NOT NULL,
  quantity NUMERIC NOT NULL CHECK (quantity >= 0),
  cost_per_unit NUMERIC,
  supplier_id UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'quarantine', 'recalled', 'expired', 'depleted')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, batch_number, lot_number)
);

-- Create batch_movements table
CREATE TABLE IF NOT EXISTS batch_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES product_batches(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('receipt', 'sale', 'adjustment', 'transfer', 'disposal', 'return')),
  quantity NUMERIC NOT NULL,
  reference_id UUID,
  reference_type TEXT, -- 'order', 'transfer', 'adjustment'
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_product_batches_product ON product_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_product_batches_expiry ON product_batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_product_batches_status ON product_batches(status);
CREATE INDEX IF NOT EXISTS idx_batch_movements_batch ON batch_movements(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_movements_reference ON batch_movements(reference_id);

-- Create function to get batches expiring soon
CREATE OR REPLACE FUNCTION get_expiring_batches(days_threshold INTEGER DEFAULT 30)
RETURNS TABLE (
  batch_id UUID,
  product_id UUID,
  product_name TEXT,
  batch_number TEXT,
  lot_number TEXT,
  expiry_date DATE,
  days_until_expiry INTEGER,
  quantity NUMERIC,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pb.id as batch_id,
    pb.product_id,
    p.name as product_name,
    pb.batch_number,
    pb.lot_number,
    pb.expiry_date,
    (pb.expiry_date - CURRENT_DATE) as days_until_expiry,
    pb.quantity,
    pb.status
  FROM product_batches pb
  JOIN products p ON pb.product_id = p.id
  WHERE pb.status = 'active'
    AND pb.expiry_date <= CURRENT_DATE + days_threshold
    AND pb.quantity > 0
  ORDER BY pb.expiry_date ASC;
END;
$$ LANGUAGE plpgsql;

-- Create function to get available batches for FEFO (First Expired, First Out)
CREATE OR REPLACE FUNCTION get_available_batches_fefo(p_product_id UUID)
RETURNS TABLE (
  batch_id UUID,
  batch_number TEXT,
  lot_number TEXT,
  expiry_date DATE,
  available_quantity NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id as batch_id,
    product_batches.batch_number,
    product_batches.lot_number,
    product_batches.expiry_date,
    quantity as available_quantity
  FROM product_batches
  WHERE product_id = p_product_id
    AND status = 'active'
    AND quantity > 0
    AND expiry_date > CURRENT_DATE
  ORDER BY expiry_date ASC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 3: EXPIRY MANAGEMENT
-- =====================================================

-- Create expiry_alerts table
CREATE TABLE IF NOT EXISTS expiry_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES product_batches(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('30_days', '60_days', '90_days', 'expired')),
  alert_date DATE NOT NULL,
  days_until_expiry INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'resolved')),
  acknowledged_by UUID REFERENCES profiles(id),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_expiry_alerts_batch ON expiry_alerts(batch_id);
CREATE INDEX IF NOT EXISTS idx_expiry_alerts_status ON expiry_alerts(status);
CREATE INDEX IF NOT EXISTS idx_expiry_alerts_type ON expiry_alerts(alert_type);

-- Create function to generate expiry alerts
CREATE OR REPLACE FUNCTION generate_expiry_alerts()
RETURNS INTEGER AS $$
DECLARE
  alerts_created INTEGER := 0;
BEGIN
  -- 90 days alert
  INSERT INTO expiry_alerts (batch_id, alert_type, alert_date, days_until_expiry)
  SELECT 
    id,
    '90_days',
    CURRENT_DATE,
    (expiry_date - CURRENT_DATE)
  FROM product_batches
  WHERE status = 'active'
    AND quantity > 0
    AND expiry_date = CURRENT_DATE + 90
    AND NOT EXISTS (
      SELECT 1 FROM expiry_alerts 
      WHERE batch_id = product_batches.id 
        AND alert_type = '90_days'
    );
  
  GET DIAGNOSTICS alerts_created = ROW_COUNT;

  -- 60 days alert
  INSERT INTO expiry_alerts (batch_id, alert_type, alert_date, days_until_expiry)
  SELECT 
    id,
    '60_days',
    CURRENT_DATE,
    (expiry_date - CURRENT_DATE)
  FROM product_batches
  WHERE status = 'active'
    AND quantity > 0
    AND expiry_date = CURRENT_DATE + 60
    AND NOT EXISTS (
      SELECT 1 FROM expiry_alerts 
      WHERE batch_id = product_batches.id 
        AND alert_type = '60_days'
    );

  -- 30 days alert
  INSERT INTO expiry_alerts (batch_id, alert_type, alert_date, days_until_expiry)
  SELECT 
    id,
    '30_days',
    CURRENT_DATE,
    (expiry_date - CURRENT_DATE)
  FROM product_batches
  WHERE status = 'active'
    AND quantity > 0
    AND expiry_date = CURRENT_DATE + 30
    AND NOT EXISTS (
      SELECT 1 FROM expiry_alerts 
      WHERE batch_id = product_batches.id 
        AND alert_type = '30_days'
    );

  -- Expired alert
  INSERT INTO expiry_alerts (batch_id, alert_type, alert_date, days_until_expiry)
  SELECT 
    id,
    'expired',
    CURRENT_DATE,
    (expiry_date - CURRENT_DATE)
  FROM product_batches
  WHERE status = 'active'
    AND quantity > 0
    AND expiry_date < CURRENT_DATE
    AND NOT EXISTS (
      SELECT 1 FROM expiry_alerts 
      WHERE batch_id = product_batches.id 
        AND alert_type = 'expired'
    );

  -- Update expired batches status
  UPDATE product_batches
  SET status = 'expired',
      updated_at = NOW()
  WHERE expiry_date < CURRENT_DATE
    AND status = 'active'
    AND quantity > 0;

  RETURN alerts_created;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if tables were created
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM (
  VALUES 
    ('stock_reservations'),
    ('product_batches'),
    ('batch_movements'),
    ('expiry_alerts')
) AS t(table_name)
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name = t.table_name
);

-- Check if functions were created
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'calculate_available_stock',
    'expire_old_reservations',
    'get_expiring_batches',
    'get_available_batches_fefo',
    'generate_expiry_alerts'
  )
ORDER BY routine_name;

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Uncomment to insert sample batch data
/*
INSERT INTO product_batches (product_id, batch_number, lot_number, manufacturing_date, expiry_date, quantity, cost_per_unit, status)
SELECT 
  id,
  'BATCH-' || LPAD((ROW_NUMBER() OVER ())::TEXT, 6, '0'),
  'LOT-' || LPAD((ROW_NUMBER() OVER ())::TEXT, 6, '0'),
  CURRENT_DATE - INTERVAL '6 months',
  CURRENT_DATE + INTERVAL '18 months',
  current_stock,
  base_price * 0.7,
  'active'
FROM products
LIMIT 5;
*/

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Phase 1 Database Setup Complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'Created Tables:';
  RAISE NOTICE '  - stock_reservations';
  RAISE NOTICE '  - product_batches';
  RAISE NOTICE '  - batch_movements';
  RAISE NOTICE '  - expiry_alerts';
  RAISE NOTICE '';
  RAISE NOTICE 'Created Functions:';
  RAISE NOTICE '  - calculate_available_stock()';
  RAISE NOTICE '  - expire_old_reservations()';
  RAISE NOTICE '  - get_expiring_batches()';
  RAISE NOTICE '  - get_available_batches_fefo()';
  RAISE NOTICE '  - generate_expiry_alerts()';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Deploy inventoryTransactionService.ts';
  RAISE NOTICE '  2. Integrate with order processing';
  RAISE NOTICE '  3. Test stock reservation flow';
  RAISE NOTICE '  4. Schedule expiry alert generation';
END $$;

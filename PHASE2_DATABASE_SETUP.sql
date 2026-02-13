-- =====================================================
-- PHASE 2: INVENTORY OPERATIONS ENHANCEMENT
-- Database Setup Script
-- =====================================================

-- =====================================================
-- PART 1: MULTI-LOCATION SUPPORT
-- =====================================================

-- Create location_stock table
CREATE TABLE IF NOT EXISTS location_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reserved_quantity NUMERIC NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  min_stock NUMERIC DEFAULT 0,
  max_stock NUMERIC,
  reorder_point NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, location_id)
);

-- Create stock_transfers table
CREATE TABLE IF NOT EXISTS stock_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_number TEXT UNIQUE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  from_location_id UUID REFERENCES locations(id),
  to_location_id UUID REFERENCES locations(id),
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'completed', 'cancelled')),
  initiated_by UUID REFERENCES profiles(id),
  received_by UUID REFERENCES profiles(id),
  notes TEXT,
  initiated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_location_stock_product ON location_stock(product_id);
CREATE INDEX IF NOT EXISTS idx_location_stock_location ON location_stock(location_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_from ON stock_transfers(from_location_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_to ON stock_transfers(to_location_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_status ON stock_transfers(status);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_product ON stock_transfers(product_id);

-- Function to get total stock across all locations
CREATE OR REPLACE FUNCTION get_total_stock(p_product_id UUID)
RETURNS NUMERIC AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(quantity), 0)
    FROM location_stock
    WHERE product_id = p_product_id
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get available stock at location
CREATE OR REPLACE FUNCTION get_location_available_stock(
  p_product_id UUID,
  p_location_id UUID
)
RETURNS NUMERIC AS $$
BEGIN
  RETURN (
    SELECT COALESCE(quantity - reserved_quantity, 0)
    FROM location_stock
    WHERE product_id = p_product_id
      AND location_id = p_location_id
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 2: CYCLE COUNTING
-- =====================================================

-- Create cycle_counts table
CREATE TABLE IF NOT EXISTS cycle_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  count_number TEXT UNIQUE NOT NULL,
  location_id UUID REFERENCES locations(id),
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  count_type TEXT DEFAULT 'full' CHECK (count_type IN ('full', 'partial', 'spot')),
  scheduled_date DATE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  counted_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create cycle_count_items table
CREATE TABLE IF NOT EXISTS cycle_count_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_count_id UUID REFERENCES cycle_counts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  expected_quantity NUMERIC NOT NULL,
  counted_quantity NUMERIC,
  variance NUMERIC GENERATED ALWAYS AS (counted_quantity - expected_quantity) STORED,
  variance_percentage NUMERIC,
  notes TEXT,
  counted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_cycle_counts_location ON cycle_counts(location_id);
CREATE INDEX IF NOT EXISTS idx_cycle_counts_status ON cycle_counts(status);
CREATE INDEX IF NOT EXISTS idx_cycle_count_items_count ON cycle_count_items(cycle_count_id);
CREATE INDEX IF NOT EXISTS idx_cycle_count_items_product ON cycle_count_items(product_id);

-- Function to calculate variance percentage
CREATE OR REPLACE FUNCTION calculate_variance_percentage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expected_quantity > 0 THEN
    NEW.variance_percentage := ((NEW.counted_quantity - NEW.expected_quantity) / NEW.expected_quantity) * 100;
  ELSE
    NEW.variance_percentage := 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_variance ON cycle_count_items;
CREATE TRIGGER trigger_calculate_variance
BEFORE INSERT OR UPDATE ON cycle_count_items
FOR EACH ROW
EXECUTE FUNCTION calculate_variance_percentage();

-- =====================================================
-- PART 3: STOCK ADJUSTMENTS
-- =====================================================

-- Create stock_adjustments table
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adjustment_number TEXT UNIQUE NOT NULL,
  product_id UUID REFERENCES products(id),
  location_id UUID REFERENCES locations(id),
  adjustment_type TEXT CHECK (adjustment_type IN ('increase', 'decrease')),
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  reason_code TEXT NOT NULL,
  reason_description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'applied')),
  requested_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_status ON stock_adjustments(status);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_product ON stock_adjustments(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_location ON stock_adjustments(location_id);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if tables were created
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count
FROM (
  VALUES 
    ('location_stock'),
    ('stock_transfers'),
    ('cycle_counts'),
    ('cycle_count_items'),
    ('stock_adjustments')
) AS t(table_name)
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name = t.table_name
)
ORDER BY table_name;

-- Check if functions were created
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_total_stock',
    'get_location_available_stock',
    'calculate_variance_percentage'
  )
ORDER BY routine_name;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Phase 2 Database Setup Complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'Created Tables:';
  RAISE NOTICE '  - location_stock (multi-location tracking)';
  RAISE NOTICE '  - stock_transfers (inter-location transfers)';
  RAISE NOTICE '  - cycle_counts (physical count management)';
  RAISE NOTICE '  - cycle_count_items (count details)';
  RAISE NOTICE '  - stock_adjustments (adjustment workflow)';
  RAISE NOTICE '';
  RAISE NOTICE 'Created Functions:';
  RAISE NOTICE '  - get_total_stock()';
  RAISE NOTICE '  - get_location_available_stock()';
  RAISE NOTICE '  - calculate_variance_percentage()';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Deploy multiLocationService.ts';
  RAISE NOTICE '  2. Deploy cycleCountService.ts';
  RAISE NOTICE '  3. Deploy stockAdjustmentService.ts';
  RAISE NOTICE '  4. Integrate barcode scanning';
  RAISE NOTICE '  5. Test multi-location transfers';
END $$;

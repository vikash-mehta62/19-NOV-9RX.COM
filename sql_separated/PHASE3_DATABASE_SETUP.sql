-- ============================================
-- PHASE 3: Advanced Reporting, Supplier Management & Cost Tracking
-- Database Schema Setup
-- ============================================

-- ============================================
-- SECTION 1: ADVANCED REPORTING
-- ============================================

-- Create inventory_reports table for saved reports
CREATE TABLE IF NOT EXISTS inventory_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL,
  report_name TEXT NOT NULL,
  parameters JSONB,
  generated_by UUID REFERENCES profiles(id),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  file_url TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create report_schedules table for automated reports
CREATE TABLE IF NOT EXISTS report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL,
  schedule_name TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  parameters JSONB,
  recipients TEXT[],
  enabled BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for reporting
CREATE INDEX IF NOT EXISTS idx_inventory_reports_type ON inventory_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_inventory_reports_generated_at ON inventory_reports(generated_at);
CREATE INDEX IF NOT EXISTS idx_report_schedules_next_run ON report_schedules(next_run_at) WHERE enabled = true;

-- ============================================
-- SECTION 2: SUPPLIER MANAGEMENT
-- ============================================

-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'USA',
  payment_terms TEXT,
  lead_time_days INTEGER DEFAULT 7,
  minimum_order_value NUMERIC DEFAULT 0,
  rating NUMERIC CHECK (rating >= 0 AND rating <= 5),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create supplier_products table (product-supplier relationship)
CREATE TABLE IF NOT EXISTS supplier_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  supplier_sku TEXT,
  cost_price NUMERIC NOT NULL,
  minimum_order_quantity INTEGER DEFAULT 1,
  lead_time_days INTEGER,
  is_preferred BOOLEAN DEFAULT false,
  last_order_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(supplier_id, product_id)
);

-- Create purchase_orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number TEXT UNIQUE NOT NULL,
  supplier_id UUID REFERENCES suppliers(id),
  order_date DATE NOT NULL,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'confirmed', 'partially_received', 'received', 'cancelled')),
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax NUMERIC DEFAULT 0,
  shipping_cost NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create purchase_order_items table
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity NUMERIC NOT NULL,
  received_quantity NUMERIC DEFAULT 0,
  unit_cost NUMERIC NOT NULL,
  total_cost NUMERIC GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create supplier_performance table
CREATE TABLE IF NOT EXISTS supplier_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  po_id UUID REFERENCES purchase_orders(id),
  on_time_delivery BOOLEAN,
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  notes TEXT,
  recorded_by UUID REFERENCES profiles(id),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for supplier management
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_supplier_products_supplier ON supplier_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_product ON supplier_products(product_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_date ON purchase_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po ON purchase_order_items(po_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_product ON purchase_order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_supplier_performance_supplier ON supplier_performance(supplier_id);

-- ============================================
-- SECTION 3: COST TRACKING
-- ============================================

-- Create product_costs table
CREATE TABLE IF NOT EXISTS product_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id),
  purchase_cost NUMERIC NOT NULL,
  shipping_cost NUMERIC DEFAULT 0,
  handling_cost NUMERIC DEFAULT 0,
  storage_cost NUMERIC DEFAULT 0,
  other_costs NUMERIC DEFAULT 0,
  total_cost NUMERIC GENERATED ALWAYS AS (
    purchase_cost + shipping_cost + handling_cost + storage_cost + other_costs
  ) STORED,
  effective_date DATE NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create cost_alerts table
CREATE TABLE IF NOT EXISTS cost_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('price_increase', 'price_decrease', 'margin_low', 'cost_spike')),
  old_value NUMERIC,
  new_value NUMERIC,
  percentage_change NUMERIC,
  threshold_exceeded BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_by UUID REFERENCES profiles(id),
  acknowledged_at TIMESTAMPTZ
);

-- Add indexes for cost tracking
CREATE INDEX IF NOT EXISTS idx_product_costs_product ON product_costs(product_id);
CREATE INDEX IF NOT EXISTS idx_product_costs_supplier ON product_costs(supplier_id);
CREATE INDEX IF NOT EXISTS idx_product_costs_date ON product_costs(effective_date);
CREATE INDEX IF NOT EXISTS idx_cost_alerts_product ON cost_alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_cost_alerts_status ON cost_alerts(status);
CREATE INDEX IF NOT EXISTS idx_cost_alerts_type ON cost_alerts(alert_type);

-- ============================================
-- SECTION 4: FUNCTIONS
-- ============================================

-- Function to calculate average cost over a period
CREATE OR REPLACE FUNCTION get_average_cost(p_product_id UUID, p_days INTEGER DEFAULT 30)
RETURNS NUMERIC AS $$
BEGIN
  RETURN (
    SELECT COALESCE(AVG(total_cost), 0)
    FROM product_costs
    WHERE product_id = p_product_id
      AND effective_date >= CURRENT_DATE - p_days
  );
END;
$$ LANGUAGE plpgsql;

-- Function to calculate profit margin
CREATE OR REPLACE FUNCTION get_profit_margin(p_product_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_selling_price NUMERIC;
  v_cost NUMERIC;
BEGIN
  -- Get selling price
  SELECT base_price INTO v_selling_price
  FROM products
  WHERE id = p_product_id;
  
  -- Get latest cost
  SELECT total_cost INTO v_cost
  FROM product_costs
  WHERE product_id = p_product_id
  ORDER BY effective_date DESC
  LIMIT 1;
  
  IF v_selling_price IS NULL OR v_cost IS NULL OR v_selling_price = 0 THEN
    RETURN 0;
  END IF;
  
  RETURN ((v_selling_price - v_cost) / v_selling_price) * 100;
END;
$$ LANGUAGE plpgsql;

-- Function to get supplier on-time delivery rate
CREATE OR REPLACE FUNCTION get_supplier_on_time_rate(p_supplier_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_total INTEGER;
  v_on_time INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM supplier_performance
  WHERE supplier_id = p_supplier_id;
  
  IF v_total = 0 THEN
    RETURN 0;
  END IF;
  
  SELECT COUNT(*) INTO v_on_time
  FROM supplier_performance
  WHERE supplier_id = p_supplier_id
    AND on_time_delivery = true;
  
  RETURN (v_on_time::NUMERIC / v_total::NUMERIC) * 100;
END;
$$ LANGUAGE plpgsql;

-- Function to get supplier average rating
CREATE OR REPLACE FUNCTION get_supplier_average_rating(p_supplier_id UUID)
RETURNS NUMERIC AS $$
BEGIN
  RETURN (
    SELECT COALESCE(AVG((quality_rating + communication_rating) / 2.0), 0)
    FROM supplier_performance
    WHERE supplier_id = p_supplier_id
  );
END;
$$ LANGUAGE plpgsql;

-- Function to update PO totals
CREATE OR REPLACE FUNCTION update_po_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE purchase_orders
  SET 
    subtotal = (
      SELECT COALESCE(SUM(total_cost), 0)
      FROM purchase_order_items
      WHERE po_id = NEW.po_id
    ),
    total_amount = (
      SELECT COALESCE(SUM(total_cost), 0) + COALESCE(tax, 0) + COALESCE(shipping_cost, 0)
      FROM purchase_order_items
      WHERE po_id = NEW.po_id
    ),
    updated_at = NOW()
  WHERE id = NEW.po_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update PO totals when items change
CREATE TRIGGER trigger_update_po_totals
AFTER INSERT OR UPDATE OR DELETE ON purchase_order_items
FOR EACH ROW
EXECUTE FUNCTION update_po_totals();

-- Function to create cost alert on price change
CREATE OR REPLACE FUNCTION check_cost_change()
RETURNS TRIGGER AS $$
DECLARE
  v_old_cost NUMERIC;
  v_change_pct NUMERIC;
BEGIN
  -- Get previous cost
  SELECT total_cost INTO v_old_cost
  FROM product_costs
  WHERE product_id = NEW.product_id
    AND effective_date < NEW.effective_date
  ORDER BY effective_date DESC
  LIMIT 1;
  
  IF v_old_cost IS NOT NULL AND v_old_cost > 0 THEN
    v_change_pct := ((NEW.total_cost - v_old_cost) / v_old_cost) * 100;
    
    -- Create alert if change is significant (>10%)
    IF ABS(v_change_pct) > 10 THEN
      INSERT INTO cost_alerts (
        product_id,
        alert_type,
        old_value,
        new_value,
        percentage_change,
        threshold_exceeded
      ) VALUES (
        NEW.product_id,
        CASE WHEN v_change_pct > 0 THEN 'price_increase' ELSE 'price_decrease' END,
        v_old_cost,
        NEW.total_cost,
        v_change_pct,
        true
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check cost changes
CREATE TRIGGER trigger_check_cost_change
AFTER INSERT ON product_costs
FOR EACH ROW
EXECUTE FUNCTION check_cost_change();

-- ============================================
-- SECTION 5: VIEWS FOR REPORTING
-- ============================================

-- View for inventory valuation
CREATE OR REPLACE VIEW inventory_valuation AS
SELECT 
  p.id AS product_id,
  p.name AS product_name,
  p.sku,
  p.category,
  p.current_stock,
  COALESCE(pc.total_cost, 0) AS unit_cost,
  p.current_stock * COALESCE(pc.total_cost, 0) AS total_value
FROM products p
LEFT JOIN LATERAL (
  SELECT total_cost
  FROM product_costs
  WHERE product_id = p.id
  ORDER BY effective_date DESC
  LIMIT 1
) pc ON true
WHERE p.current_stock > 0;

-- View for product profitability
CREATE OR REPLACE VIEW product_profitability AS
SELECT 
  p.id AS product_id,
  p.name AS product_name,
  p.sku,
  p.category,
  p.base_price AS selling_price,
  COALESCE(pc.total_cost, 0) AS cost,
  p.base_price - COALESCE(pc.total_cost, 0) AS profit,
  CASE 
    WHEN p.base_price > 0 THEN 
      ((p.base_price - COALESCE(pc.total_cost, 0)) / p.base_price) * 100
    ELSE 0
  END AS margin_percentage
FROM products p
LEFT JOIN LATERAL (
  SELECT total_cost
  FROM product_costs
  WHERE product_id = p.id
  ORDER BY effective_date DESC
  LIMIT 1
) pc ON true;

-- View for supplier performance summary
CREATE OR REPLACE VIEW supplier_performance_summary AS
SELECT 
  s.id AS supplier_id,
  s.name AS supplier_name,
  s.supplier_code,
  COUNT(DISTINCT po.id) AS total_orders,
  COUNT(DISTINCT CASE WHEN po.status = 'received' THEN po.id END) AS completed_orders,
  AVG(CASE WHEN sp.on_time_delivery THEN 1 ELSE 0 END) * 100 AS on_time_rate,
  AVG((sp.quality_rating + sp.communication_rating) / 2.0) AS average_rating,
  SUM(po.total_amount) AS total_spend
FROM suppliers s
LEFT JOIN purchase_orders po ON s.id = po.supplier_id
LEFT JOIN supplier_performance sp ON s.id = sp.supplier_id
GROUP BY s.id, s.name, s.supplier_code;

-- ============================================
-- SECTION 6: SAMPLE DATA (Optional)
-- ============================================

-- Insert sample supplier
INSERT INTO suppliers (supplier_code, name, contact_person, email, phone, payment_terms, lead_time_days, status)
VALUES 
  ('SUP001', 'Medical Supplies Inc', 'John Smith', 'john@medicalsupplies.com', '555-0100', 'Net 30', 7, 'active'),
  ('SUP002', 'Healthcare Products Co', 'Jane Doe', 'jane@healthcareproducts.com', '555-0200', 'Net 45', 14, 'active'),
  ('SUP003', 'Pharma Distributors', 'Bob Johnson', 'bob@pharmadist.com', '555-0300', 'Net 60', 10, 'active')
ON CONFLICT (supplier_code) DO NOTHING;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Phase 3 database schema created successfully!';
  RAISE NOTICE '📊 Tables: inventory_reports, report_schedules';
  RAISE NOTICE '🏭 Tables: suppliers, supplier_products, purchase_orders, purchase_order_items, supplier_performance';
  RAISE NOTICE '💰 Tables: product_costs, cost_alerts';
  RAISE NOTICE '🔧 Functions: get_average_cost, get_profit_margin, get_supplier_on_time_rate, get_supplier_average_rating';
  RAISE NOTICE '📈 Views: inventory_valuation, product_profitability, supplier_performance_summary';
  RAISE NOTICE '✨ Phase 3 is ready to use!';
END $$;

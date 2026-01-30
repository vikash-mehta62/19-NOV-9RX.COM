-- Analytics Performance Optimization Indexes
-- This migration adds indexes to improve analytics query performance

-- Index on orders for analytics queries
CREATE INDEX IF NOT EXISTS idx_orders_analytics 
ON orders(created_at, void, deleted_at) 
WHERE (void IS NULL OR void = false) AND deleted_at IS NULL;

-- Index on order_items for product analytics
CREATE INDEX IF NOT EXISTS idx_order_items_product 
ON order_items(product_id, quantity, price);

-- Index on profiles for store analytics
CREATE INDEX IF NOT EXISTS idx_profiles_type_status 
ON profiles(type, status) 
WHERE type IN ('pharmacy', 'hospital', 'group');

-- Index on orders for date range queries
CREATE INDEX IF NOT EXISTS idx_orders_created_at 
ON orders(created_at DESC) 
WHERE (void IS NULL OR void = false) AND deleted_at IS NULL;

-- Index on orders for payment analytics
CREATE INDEX IF NOT EXISTS idx_orders_payment_status 
ON orders(payment_status, profile_id, created_at) 
WHERE (void IS NULL OR void = false) AND deleted_at IS NULL;

-- Index for purchase order filtering
CREATE INDEX IF NOT EXISTS idx_orders_po_approved
ON orders("poApproved", created_at)
WHERE (void IS NULL OR void = false) AND deleted_at IS NULL;

-- Comment for documentation
COMMENT ON INDEX idx_orders_analytics IS 'Composite index for analytics queries on orders table';
COMMENT ON INDEX idx_order_items_product IS 'Index for product performance analytics';
COMMENT ON INDEX idx_profiles_type_status IS 'Index for store analytics queries';
COMMENT ON INDEX idx_orders_created_at IS 'Index for date range filtering in analytics';
COMMENT ON INDEX idx_orders_payment_status IS 'Index for payment and AR aging analytics';
COMMENT ON INDEX idx_orders_po_approved IS 'Index for separating sales orders from purchase orders in analytics';

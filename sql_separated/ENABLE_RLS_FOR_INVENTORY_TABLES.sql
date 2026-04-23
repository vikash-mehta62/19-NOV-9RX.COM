-- Enable RLS and Add Policies for Inventory & Alert Tables
-- This migration enables Row Level Security for tables that currently have it disabled
-- and adds appropriate policies based on user roles and authentication

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE alert_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_reorder_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycle_count_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycle_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE expiry_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ALERT_TYPES TABLE POLICIES
-- ============================================================================

-- Admin can do everything
CREATE POLICY "Admin full access to alert_types"
ON alert_types
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- All authenticated users can view alert types
CREATE POLICY "Authenticated users can view alert_types"
ON alert_types
FOR SELECT
TO authenticated
USING (true);

-- ============================================================================
-- AUTO_REORDER_CONFIG TABLE POLICIES
-- ============================================================================

-- Admin full access
CREATE POLICY "Admin full access to auto_reorder_config"
ON auto_reorder_config
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- All authenticated users can view
CREATE POLICY "Authenticated users can view auto_reorder_config"
ON auto_reorder_config
FOR SELECT
TO authenticated
USING (true);

-- ============================================================================
-- BATCH_MOVEMENTS TABLE POLICIES
-- ============================================================================

-- Admin full access
CREATE POLICY "Admin full access to batch_movements"
ON batch_movements
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Users can view their own movements
CREATE POLICY "Users can view batch_movements"
ON batch_movements
FOR SELECT
TO authenticated
USING (true);

-- Users can create batch movements
CREATE POLICY "Authenticated users can create batch_movements"
ON batch_movements
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
);

-- ============================================================================
-- CYCLE_COUNT_ITEMS TABLE POLICIES
-- ============================================================================

-- Admin full access
CREATE POLICY "Admin full access to cycle_count_items"
ON cycle_count_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- All authenticated users can view
CREATE POLICY "Authenticated users can view cycle_count_items"
ON cycle_count_items
FOR SELECT
TO authenticated
USING (true);

-- Authenticated users can insert/update cycle count items
CREATE POLICY "Authenticated users can manage cycle_count_items"
ON cycle_count_items
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update cycle_count_items"
ON cycle_count_items
FOR UPDATE
TO authenticated
USING (true);

-- ============================================================================
-- CYCLE_COUNTS TABLE POLICIES
-- ============================================================================

-- Admin full access
CREATE POLICY "Admin full access to cycle_counts"
ON cycle_counts
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- All authenticated users can view
CREATE POLICY "Authenticated users can view cycle_counts"
ON cycle_counts
FOR SELECT
TO authenticated
USING (true);

-- Authenticated users can create cycle counts
CREATE POLICY "Authenticated users can create cycle_counts"
ON cycle_counts
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Users can update cycle counts they're involved with
CREATE POLICY "Users can update their cycle_counts"
ON cycle_counts
FOR UPDATE
TO authenticated
USING (
  counted_by = auth.uid() OR
  approved_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- ============================================================================
-- DASHBOARD_WIDGETS TABLE POLICIES
-- ============================================================================

-- Admin full access
CREATE POLICY "Admin full access to dashboard_widgets"
ON dashboard_widgets
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- All authenticated users can view active widgets
CREATE POLICY "Authenticated users can view dashboard_widgets"
ON dashboard_widgets
FOR SELECT
TO authenticated
USING (is_active = true);

-- ============================================================================
-- EXPIRY_ALERTS TABLE POLICIES
-- ============================================================================

-- Admin full access
CREATE POLICY "Admin full access to expiry_alerts"
ON expiry_alerts
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- All authenticated users can view expiry alerts
CREATE POLICY "Authenticated users can view expiry_alerts"
ON expiry_alerts
FOR SELECT
TO authenticated
USING (true);

-- Users can acknowledge alerts
CREATE POLICY "Users can acknowledge expiry_alerts"
ON expiry_alerts
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (
  acknowledged_by = auth.uid()
);

-- ============================================================================
-- LOCATION_STOCK TABLE POLICIES
-- ============================================================================

-- Admin full access
CREATE POLICY "Admin full access to location_stock"
ON location_stock
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- All authenticated users can view location stock
CREATE POLICY "Authenticated users can view location_stock"
ON location_stock
FOR SELECT
TO authenticated
USING (true);

-- Authenticated users can update location stock
CREATE POLICY "Authenticated users can update location_stock"
ON location_stock
FOR UPDATE
TO authenticated
USING (true);

-- Authenticated users can insert location stock
CREATE POLICY "Authenticated users can insert location_stock"
ON location_stock
FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================================================
-- PRODUCT_BATCHES TABLE POLICIES
-- ============================================================================

-- Admin full access
CREATE POLICY "Admin full access to product_batches"
ON product_batches
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- All authenticated users can view product batches
CREATE POLICY "Authenticated users can view product_batches"
ON product_batches
FOR SELECT
TO authenticated
USING (true);

-- Authenticated users can create product batches
CREATE POLICY "Authenticated users can create product_batches"
ON product_batches
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Authenticated users can update product batches
CREATE POLICY "Authenticated users can update product_batches"
ON product_batches
FOR UPDATE
TO authenticated
USING (true);

-- ============================================================================
-- STOCK_ADJUSTMENTS TABLE POLICIES
-- ============================================================================

-- Admin full access
CREATE POLICY "Admin full access to stock_adjustments"
ON stock_adjustments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- All authenticated users can view stock adjustments
CREATE POLICY "Authenticated users can view stock_adjustments"
ON stock_adjustments
FOR SELECT
TO authenticated
USING (true);

-- Authenticated users can create stock adjustments
CREATE POLICY "Authenticated users can create stock_adjustments"
ON stock_adjustments
FOR INSERT
TO authenticated
WITH CHECK (
  requested_by = auth.uid()
);

-- Users can update their own requested adjustments or if they're approving
CREATE POLICY "Users can update stock_adjustments"
ON stock_adjustments
FOR UPDATE
TO authenticated
USING (
  requested_by = auth.uid() OR
  approved_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- ============================================================================
-- STOCK_RESERVATIONS TABLE POLICIES
-- ============================================================================

-- Admin full access
CREATE POLICY "Admin full access to stock_reservations"
ON stock_reservations
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Users can view stock reservations
CREATE POLICY "Authenticated users can view stock_reservations"
ON stock_reservations
FOR SELECT
TO authenticated
USING (true);

-- System can create stock reservations (for orders)
CREATE POLICY "System can create stock_reservations"
ON stock_reservations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- System can update stock reservations
CREATE POLICY "System can update stock_reservations"
ON stock_reservations
FOR UPDATE
TO authenticated
USING (true);

-- ============================================================================
-- STOCK_TRANSFERS TABLE POLICIES
-- ============================================================================

-- Admin full access
CREATE POLICY "Admin full access to stock_transfers"
ON stock_transfers
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- All authenticated users can view stock transfers
CREATE POLICY "Authenticated users can view stock_transfers"
ON stock_transfers
FOR SELECT
TO authenticated
USING (true);

-- Authenticated users can create stock transfers
CREATE POLICY "Authenticated users can create stock_transfers"
ON stock_transfers
FOR INSERT
TO authenticated
WITH CHECK (
  initiated_by = auth.uid()
);

-- Users involved in the transfer can update it
CREATE POLICY "Users can update their stock_transfers"
ON stock_transfers
FOR UPDATE
TO authenticated
USING (
  initiated_by = auth.uid() OR
  received_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these queries to verify RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN (
--   'alert_types', 'auto_reorder_config', 'batch_movements', 
--   'cycle_count_items', 'cycle_counts', 'dashboard_widgets',
--   'expiry_alerts', 'location_stock', 'product_batches',
--   'stock_adjustments', 'stock_reservations', 'stock_transfers'
-- );

-- To view all policies for a table:
-- SELECT * FROM pg_policies WHERE tablename = 'alert_types';

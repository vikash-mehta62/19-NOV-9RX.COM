-- jo purane order invoices hai usme paid amount ko update karna hai agar paid hai to total amount ke sath wesa karn ahai 
-- Migration: Add paid_amount field to orders and invoices tables
-- This field will track the actual amount paid by customer
-- When items are edited, this field preserves the original paid amount
-- 
-- Run this migration in Supabase SQL Editor:
-- 1. Go to Supabase Dashboard > SQL Editor
-- 2. Paste this SQL and run it

-- Add paid_amount column to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) DEFAULT 0;

-- Add paid_amount column to invoices table
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) DEFAULT 0;

-- Update existing paid orders to set paid_amount = total_amount
-- This handles legacy orders that don't have paid_amount set
UPDATE orders 
SET paid_amount = total_amount 
WHERE payment_status = 'paid' 
AND (paid_amount IS NULL OR paid_amount = 0);

-- Update existing paid invoices to set paid_amount = total_amount
UPDATE invoices 
SET paid_amount = total_amount 
WHERE payment_status = 'paid' 
AND (paid_amount IS NULL OR paid_amount = 0);

-- Add comment for documentation
COMMENT ON COLUMN orders.paid_amount IS 'Actual amount paid by customer. Used to calculate balance due when order is modified.';
COMMENT ON COLUMN invoices.paid_amount IS 'Actual amount paid by customer. Used to calculate balance due when invoice is modified.';

-- Verify the migration
SELECT 
  'orders' as table_name,
  COUNT(*) as total_orders,
  COUNT(CASE WHEN paid_amount > 0 THEN 1 END) as orders_with_paid_amount
FROM orders
WHERE payment_status = 'paid'
UNION ALL
SELECT 
  'invoices' as table_name,
  COUNT(*) as total_invoices,
  COUNT(CASE WHEN paid_amount > 0 THEN 1 END) as invoices_with_paid_amount
FROM invoices
WHERE payment_status = 'paid';
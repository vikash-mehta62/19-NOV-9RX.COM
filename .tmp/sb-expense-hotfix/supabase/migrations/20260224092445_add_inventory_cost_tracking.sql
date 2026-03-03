-- Add cost tracking columns to products table
-- Run this migration to enable cost tracking for inventory valuation

-- Add cost price columns if they don't exist
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_cost DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_cost DECIMAL(10,2) DEFAULT 0;

-- Add received date to purchase order items
ALTER TABLE purchase_order_items
ADD COLUMN IF NOT EXISTS received_date TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN products.cost_price IS 'Current cost price per unit';
COMMENT ON COLUMN products.last_cost IS 'Last purchase cost per unit';
COMMENT ON COLUMN products.average_cost IS 'Weighted average cost per unit';
COMMENT ON COLUMN purchase_order_items.received_date IS 'Date when items were received';

-- Create function to calculate average cost
CREATE OR REPLACE FUNCTION update_average_cost()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate weighted average cost when receiving inventory
  IF NEW.type = 'receipt' AND NEW.quantity > 0 THEN
    UPDATE products
    SET average_cost = (
      (COALESCE(current_stock, 0) * COALESCE(average_cost, 0) + NEW.quantity * COALESCE(last_cost, 0))
      / NULLIF(COALESCE(current_stock, 0) + NEW.quantity, 0)
    )
    WHERE id = NEW.product_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update average cost
DROP TRIGGER IF EXISTS trigger_update_average_cost ON inventory_transactions;
CREATE TRIGGER trigger_update_average_cost
  AFTER INSERT ON inventory_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_average_cost();

-- Backfill cost_price from base_price for existing products
UPDATE products 
SET cost_price = base_price * 0.6,
    average_cost = base_price * 0.6
WHERE cost_price IS NULL OR cost_price = 0;;

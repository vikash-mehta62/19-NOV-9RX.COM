-- Add invoice_number column to orders table
-- Invoice number is generated when admin confirms/processes an order
-- Sales Order (order_number) is created when customer places order
-- Invoice (invoice_number) is created when admin confirms the order

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS invoice_number TEXT;
-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_invoice_number ON orders(invoice_number);
-- Add comment for documentation
COMMENT ON COLUMN orders.invoice_number IS 'Invoice number generated when order is confirmed. Format: INV-YYYYMMDD-XXXXX';

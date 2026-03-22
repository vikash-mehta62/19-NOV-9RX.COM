-- Add automatic shipping charge settings to settings table
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS auto_shipping_charge_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_shipping_charge_threshold numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS auto_shipping_charge_amount numeric(10,2) DEFAULT 0;

-- Add shipping override reason to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS shipping_override_reason text;

-- Add comment for documentation
COMMENT ON COLUMN settings.auto_shipping_charge_enabled IS 'Enable automatic shipping charges for orders below threshold';
COMMENT ON COLUMN settings.auto_shipping_charge_threshold IS 'Order subtotal threshold below which shipping charges apply';
COMMENT ON COLUMN settings.auto_shipping_charge_amount IS 'Shipping charge amount to apply to qualifying orders';
COMMENT ON COLUMN orders.shipping_override_reason IS 'Reason for overriding automatic shipping charges';

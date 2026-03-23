-- Add per-customer shipping settings to profiles table
-- This provides complete profile-level shipping control with proper priority

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS free_shipping_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS free_shipping_threshold numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS custom_shipping_rate numeric(10,2),    
ADD COLUMN IF NOT EXISTS auto_shipping_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_shipping_threshold numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS auto_shipping_amount numeric(10,2) DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN profiles.free_shipping_enabled IS 'Enable free shipping for this customer when threshold is met';
COMMENT ON COLUMN profiles.free_shipping_threshold IS 'Minimum order amount for free shipping (0 = always free if enabled)';
COMMENT ON COLUMN profiles.custom_shipping_rate IS 'Custom flat shipping rate for this customer (NULL = use global settings)';
COMMENT ON COLUMN profiles.auto_shipping_enabled IS 'Enable automatic shipping charges for orders below threshold';
COMMENT ON COLUMN profiles.auto_shipping_threshold IS 'Order subtotal threshold below which auto shipping charges apply';
COMMENT ON COLUMN profiles.auto_shipping_amount IS 'Shipping charge amount for orders below threshold';

-- Diagnostic query to check global shipping settings in database

-- 1. Check if settings table exists and has is_global column
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'settings' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check if there's a global settings row
SELECT * FROM settings WHERE is_global = true LIMIT 1;

-- 3. Check all settings rows (to see what exists)
SELECT 
  id,
  is_global,
  auto_shipping_charge_enabled,
  auto_shipping_charge_threshold,
  auto_shipping_charge_amount,
  free_shipping_enabled,
  free_shipping_threshold,
  default_shipping_rate,
  handling_fee,
  created_at
FROM settings 
ORDER BY is_global DESC, created_at DESC;

-- 4. If no global settings exist, insert default row
-- UNCOMMENT THIS IF NEEDED:
-- INSERT INTO settings (
--   is_global,
--   auto_shipping_charge_enabled,
--   auto_shipping_charge_threshold,
--   auto_shipping_charge_amount,
--   free_shipping_enabled,
--   free_shipping_threshold,
--   default_shipping_rate,
--   handling_fee
-- ) VALUES (
--   true,
--   false,
--   0,
--   0,
--   false,
--   0,
--   0,
--   0
-- )
-- ON CONFLICT (id) WHERE is_global = true DO NOTHING;

-- Add extended settings columns to settings table

-- Tax Settings
ALTER TABLE settings ADD COLUMN IF NOT EXISTS tax_enabled boolean DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS default_tax_rate numeric(5,2) DEFAULT 0;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS tax_id_display text;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS tax_label text DEFAULT 'Tax';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS tax_included_in_price boolean DEFAULT false;
-- Shipping Settings
ALTER TABLE settings ADD COLUMN IF NOT EXISTS default_shipping_rate numeric(10,2) DEFAULT 0;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS free_shipping_threshold numeric(10,2) DEFAULT 0;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS free_shipping_enabled boolean DEFAULT false;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS shipping_calculation_method text DEFAULT 'flat_rate';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS handling_fee numeric(10,2) DEFAULT 0;
-- Order Settings
ALTER TABLE settings ADD COLUMN IF NOT EXISTS minimum_order_amount numeric(10,2) DEFAULT 0;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS order_number_prefix text DEFAULT 'ORD';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS next_order_number integer DEFAULT 1000;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS allow_guest_checkout boolean DEFAULT false;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS require_phone_number boolean DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS auto_confirm_orders boolean DEFAULT false;
-- Email Settings (SMTP)
ALTER TABLE settings ADD COLUMN IF NOT EXISTS smtp_host text;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS smtp_port integer DEFAULT 587;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS smtp_username text;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS smtp_password text;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS smtp_encryption text DEFAULT 'tls';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS sender_name text;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS sender_email text;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS reply_to_email text;
-- Store Hours
ALTER TABLE settings ADD COLUMN IF NOT EXISTS store_hours jsonb DEFAULT '{
  "monday": {"open": "09:00", "close": "17:00", "closed": false},
  "tuesday": {"open": "09:00", "close": "17:00", "closed": false},
  "wednesday": {"open": "09:00", "close": "17:00", "closed": false},
  "thursday": {"open": "09:00", "close": "17:00", "closed": false},
  "friday": {"open": "09:00", "close": "17:00", "closed": false},
  "saturday": {"open": "10:00", "close": "14:00", "closed": false},
  "sunday": {"open": "", "close": "", "closed": true}
}'::jsonb;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/New_York';
-- Social Media Links
ALTER TABLE settings ADD COLUMN IF NOT EXISTS social_facebook text;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS social_instagram text;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS social_twitter text;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS social_linkedin text;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS social_youtube text;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS social_tiktok text;
-- Currency Settings
ALTER TABLE settings ADD COLUMN IF NOT EXISTS default_currency text DEFAULT 'USD';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS currency_symbol text DEFAULT '$';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS currency_position text DEFAULT 'before';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS decimal_separator text DEFAULT '.';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS thousand_separator text DEFAULT ',';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS decimal_places integer DEFAULT 2;

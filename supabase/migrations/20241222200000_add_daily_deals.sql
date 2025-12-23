-- Daily Deals Configuration Table
CREATE TABLE IF NOT EXISTS daily_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  discount_percent INTEGER NOT NULL DEFAULT 10 CHECK (discount_percent >= 1 AND discount_percent <= 90),
  badge_type TEXT DEFAULT 'HOT DEAL' CHECK (badge_type IN ('HOT DEAL', 'BEST SELLER', 'LIMITED', 'FLASH SALE', 'CLEARANCE')),
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id)
);
-- Daily Deals Settings Table (for global settings)
CREATE TABLE IF NOT EXISTS daily_deals_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled BOOLEAN DEFAULT true,
  section_title TEXT DEFAULT 'Deals of the Day',
  section_subtitle TEXT DEFAULT 'Limited time offers - Don''t miss out!',
  countdown_enabled BOOLEAN DEFAULT true,
  max_products INTEGER DEFAULT 6,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Insert default settings
INSERT INTO daily_deals_settings (is_enabled, section_title, section_subtitle, countdown_enabled, max_products)
VALUES (true, 'Deals of the Day', 'Limited time offers - Don''t miss out!', true, 6)
ON CONFLICT DO NOTHING;
-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_daily_deals_active ON daily_deals(is_active, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_daily_deals_product ON daily_deals(product_id);
-- Enable RLS
ALTER TABLE daily_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_deals_settings ENABLE ROW LEVEL SECURITY;
-- Policies for daily_deals
CREATE POLICY "Allow public read access to active daily deals" ON daily_deals
  FOR SELECT USING (is_active = true AND start_date <= NOW() AND end_date >= NOW());
CREATE POLICY "Allow admin full access to daily deals" ON daily_deals
  FOR ALL USING (true);
-- Policies for daily_deals_settings
CREATE POLICY "Allow public read access to daily deals settings" ON daily_deals_settings
  FOR SELECT USING (true);
CREATE POLICY "Allow admin full access to daily deals settings" ON daily_deals_settings
  FOR ALL USING (true);

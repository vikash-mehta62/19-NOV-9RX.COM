-- Festival Themes System for USA Holidays
-- Migration: 20241210_festival_themes.sql

-- Create festival_themes table
CREATE TABLE IF NOT EXISTS festival_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  primary_color VARCHAR(20) DEFAULT '#000000',
  secondary_color VARCHAR(20) DEFAULT '#ffffff',
  accent_color VARCHAR(20) DEFAULT '#ff0000',
  background_color VARCHAR(20) DEFAULT '#f5f5f5',
  text_color VARCHAR(20) DEFAULT '#000000',
  icon VARCHAR(50),
  banner_image_url TEXT,
  banner_text TEXT,
  effects JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT false,
  auto_activate BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_festival_themes_dates ON festival_themes(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_festival_themes_active ON festival_themes(is_active);
CREATE INDEX IF NOT EXISTS idx_festival_themes_slug ON festival_themes(slug);

-- Insert default USA festival themes
INSERT INTO festival_themes (name, slug, description, start_date, end_date, primary_color, secondary_color, accent_color, background_color, text_color, icon, effects, auto_activate, priority) VALUES
-- Christmas
('Christmas', 'christmas', 'Celebrate the holiday season with festive decorations', '2024-12-01', '2024-12-25', '#c41e3a', '#165b33', '#ffd700', '#fff5f5', '#1a1a1a', '🎄', '["snowflakes", "gifts"]', true, 10),

-- New Year
('New Year', 'new-year', 'Ring in the New Year with style', '2024-12-26', '2025-01-05', '#ffd700', '#c0c0c0', '#000000', '#1a1a2e', '#ffffff', '🎆', '["fireworks", "confetti"]', true, 9),

-- Valentine''s Day
('Valentine''s Day', 'valentines-day', 'Spread the love this Valentine''s Day', '2025-02-01', '2025-02-14', '#ff1493', '#ff69b4', '#ffffff', '#fff0f5', '#1a1a1a', '❤️', '["hearts", "roses"]', true, 8),

-- St. Patrick''s Day
('St. Patrick''s Day', 'st-patricks-day', 'Get lucky with our St. Patrick''s Day deals', '2025-03-10', '2025-03-17', '#009a44', '#ffd700', '#ffffff', '#f0fff0', '#1a1a1a', '☘️', '["shamrocks", "rainbow"]', true, 7),

-- Easter
('Easter', 'easter', 'Hop into Easter savings', '2025-04-06', '2025-04-20', '#ffb6c1', '#98fb98', '#fffacd', '#fffaf0', '#1a1a1a', '🐰', '["eggs", "bunny"]', true, 7),

-- Memorial Day
('Memorial Day', 'memorial-day', 'Honor and remember with Memorial Day savings', '2025-05-19', '2025-05-26', '#bf0a30', '#ffffff', '#002868', '#f5f5f5', '#1a1a1a', '🇺🇸', '["flags", "stars"]', true, 6),

-- 4th of July
('4th of July', 'independence-day', 'Celebrate Independence Day with explosive deals', '2025-06-25', '2025-07-04', '#bf0a30', '#ffffff', '#002868', '#f0f8ff', '#1a1a1a', '🎆', '["fireworks", "flags", "stars"]', true, 10),

-- Back to School
('Back to School', 'back-to-school', 'Get ready for the new school year', '2025-08-01', '2025-08-31', '#4169e1', '#ffa500', '#32cd32', '#f5f5dc', '#1a1a1a', '📚', '["books", "pencils"]', true, 5),

-- Halloween
('Halloween', 'halloween', 'Spooky savings await this Halloween', '2025-10-01', '2025-10-31', '#ff6600', '#000000', '#800080', '#1a1a1a', '#ffffff', '🎃', '["pumpkins", "ghosts", "bats"]', true, 9),

-- Thanksgiving
('Thanksgiving', 'thanksgiving', 'Give thanks with great deals', '2025-11-01', '2025-11-27', '#d2691e', '#8b4513', '#ffd700', '#fff8dc', '#1a1a1a', '🦃', '["turkey", "leaves"]', true, 8),

-- Black Friday
('Black Friday', 'black-friday', 'Biggest deals of the year', '2025-11-28', '2025-11-28', '#000000', '#ffd700', '#ff0000', '#1a1a1a', '#ffffff', '🛒', '["sale-tags", "shopping"]', true, 10),

-- Cyber Monday
('Cyber Monday', 'cyber-monday', 'Online deals you can''t miss', '2025-12-01', '2025-12-01', '#00bfff', '#00ff00', '#000000', '#0a0a1a', '#00ff00', '💻', '["digital", "neon"]', true, 10),

-- Fall/Autumn
('Fall Season', 'fall-autumn', 'Embrace the colors of autumn', '2025-09-01', '2025-11-30', '#d2691e', '#8b0000', '#ffd700', '#faf0e6', '#1a1a1a', '🍂', '["falling-leaves"]', true, 3),

-- Winter
('Winter Season', 'winter', 'Cozy up with winter savings', '2025-12-01', '2026-02-28', '#add8e6', '#ffffff', '#4169e1', '#f0f8ff', '#1a1a1a', '❄️', '["snowflakes", "ice"]', true, 2);

-- Enable RLS
ALTER TABLE festival_themes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access to festival_themes" ON festival_themes
  FOR SELECT USING (true);

CREATE POLICY "Allow admin full access to festival_themes" ON festival_themes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- SUBCATEGORY TABLE CREATION
-- =====================================================

-- Create subcategory_configs table
CREATE TABLE IF NOT EXISTS subcategory_configs (
  id BIGSERIAL PRIMARY KEY,
  category_name TEXT NOT NULL,
  subcategory_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(category_name, subcategory_name)
);

-- Add RLS (Row Level Security) policies if needed
ALTER TABLE subcategory_configs ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (adjust as per your security needs)
CREATE POLICY "Allow all operations for authenticated users" ON subcategory_configs
  FOR ALL USING (true);

-- =====================================================
-- INSERT CATEGORIES INTO category_configs
-- =====================================================

-- Insert main categories (if not already exists)
INSERT INTO category_configs (category_name, size_units, default_unit, has_rolls, requires_case)
VALUES 
  ('CONTAINERS & CLOSURES', ARRAY['ml', 'oz', 'count'], 'count', false, true),
  ('RX LABELS', ARRAY['count', 'roll'], 'count', true, false),
  ('COMPLIANCE PACKAGING', ARRAY['count', 'pack'], 'count', false, true),
  ('RX PAPER BAGS', ARRAY['count', 'pack'], 'count', false, true),
  ('ORAL SYRINGES & ACCESSORIES', ARRAY['ml', 'count'], 'count', false, true),
  ('OTHER SUPPLY', ARRAY['count', 'box'], 'count', false, true)
ON CONFLICT (category_name) DO NOTHING;

-- =====================================================
-- INSERT SUBCATEGORIES INTO subcategory_configs
-- =====================================================

-- CONTAINERS & CLOSURES subcategories
INSERT INTO subcategory_configs (category_name, subcategory_name)
VALUES 
  ('CONTAINERS & CLOSURES', 'PUSH DOWN & TURN'),
  ('CONTAINERS & CLOSURES', 'THUMB – CLICK'),
  ('CONTAINERS & CLOSURES', 'LIQUID BOTTLES'),
  ('CONTAINERS & CLOSURES', 'OINTMENT JARS')
ON CONFLICT (category_name, subcategory_name) DO NOTHING;

-- RX LABELS subcategories
INSERT INTO subcategory_configs (category_name, subcategory_name)
VALUES 
  ('RX LABELS', 'DIRECT THERMAL RX LABELS'),
  ('RX LABELS', 'LASER LABELS')
ON CONFLICT (category_name, subcategory_name) DO NOTHING;

-- COMPLIANCE PACKAGING subcategories
INSERT INTO subcategory_configs (category_name, subcategory_name)
VALUES 
  ('COMPLIANCE PACKAGING', 'HEAT SEAL CARDS – SINGLE DOSE'),
  ('COMPLIANCE PACKAGING', 'COLD SEAL CARDS – SINGLE DOSE'),
  ('COMPLIANCE PACKAGING', 'BLISTERS – SINGLE DOSE'),
  ('COMPLIANCE PACKAGING', 'COLD SEAL LABELS – MULTI DOSE'),
  ('COMPLIANCE PACKAGING', 'BLISTERS – MULTI DOSE'),
  ('COMPLIANCE PACKAGING', 'COLD SEAL BLISTER & CARDS COMBO – MULTI DOSE')
ON CONFLICT (category_name, subcategory_name) DO NOTHING;

-- RX PAPER BAGS subcategories
INSERT INTO subcategory_configs (category_name, subcategory_name)
VALUES 
  ('RX PAPER BAGS', 'FLAT BOTTOM STOCK RX BAGS'),
  ('RX PAPER BAGS', 'SQUARE BOTTOM STOCK RX BAGS')
ON CONFLICT (category_name, subcategory_name) DO NOTHING;

-- ORAL SYRINGES & ACCESSORIES subcategories
INSERT INTO subcategory_configs (category_name, subcategory_name)
VALUES 
  ('ORAL SYRINGES & ACCESSORIES', 'ORAL SYRINGES'),
  ('ORAL SYRINGES & ACCESSORIES', 'FITMENTS & ADAPTERS')
ON CONFLICT (category_name, subcategory_name) DO NOTHING;

-- OTHER SUPPLY subcategories
INSERT INTO subcategory_configs (category_name, subcategory_name)
VALUES 
  ('OTHER SUPPLY', 'MEDICINE SHIPPING SUPPLY'),
  ('OTHER SUPPLY', 'CORRUGATED BOXES')
ON CONFLICT (category_name, subcategory_name) DO NOTHING;

-- =====================================================
-- USEFUL QUERIES FOR CATEGORY MANAGEMENT
-- =====================================================

-- Get all categories
-- SELECT * FROM category_configs ORDER BY category_name;

-- Get all subcategories for a specific category
-- SELECT * FROM subcategory_configs WHERE category_name = 'CONTAINERS & CLOSURES' ORDER BY subcategory_name;

-- Get all categories with their subcategories
-- SELECT 
--   cc.category_name,
--   sc.subcategory_name
-- FROM category_configs cc
-- LEFT JOIN subcategory_configs sc ON cc.category_name = sc.category_name
-- ORDER BY cc.category_name, sc.subcategory_name;

-- Add a new category
-- INSERT INTO category_configs (category_name, size_units, default_unit, has_rolls, requires_case)
-- VALUES ('NEW CATEGORY', ARRAY['count'], 'count', false, true);

-- Add a new subcategory
-- INSERT INTO subcategory_configs (category_name, subcategory_name)
-- VALUES ('CONTAINERS & CLOSURES', 'NEW SUBCATEGORY');

-- Update a category
-- UPDATE category_configs 
-- SET size_units = ARRAY['ml', 'oz'], default_unit = 'ml'
-- WHERE category_name = 'CONTAINERS & CLOSURES';

-- Update a subcategory
-- UPDATE subcategory_configs 
-- SET subcategory_name = 'UPDATED NAME'
-- WHERE category_name = 'CONTAINERS & CLOSURES' AND subcategory_name = 'OLD NAME';


























-- 1) Ensure category_configs exists (create if not)
CREATE TABLE IF NOT EXISTS category_configs (
  id BIGSERIAL PRIMARY KEY,
  category_name TEXT NOT NULL,
  size_units TEXT[] DEFAULT ARRAY['count'],
  default_unit TEXT DEFAULT 'count',
  has_rolls BOOLEAN DEFAULT FALSE,
  requires_case BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) Ensure subcategory_configs exists (create if not)
CREATE TABLE IF NOT EXISTS subcategory_configs (
  id BIGSERIAL PRIMARY KEY,
  category_name TEXT NOT NULL,
  subcategory_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3) Create UNIQUE indexes if missing (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS idx_category_name_unique ON category_configs (category_name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subcategory_unique ON subcategory_configs (category_name, subcategory_name);

-- 4) (Optional) If you prefer a CONSTRAINT instead of index, you can run:
-- ALTER TABLE category_configs ADD CONSTRAINT category_name_unique UNIQUE (category_name);
-- ALTER TABLE subcategory_configs ADD CONSTRAINT subcategory_unique UNIQUE (category_name, subcategory_name);
-- Note: above ALTER will fail if a duplicate already exists. Prefer CREATE UNIQUE INDEX IF NOT EXISTS.

-- 5) Now run your inserts (these will no longer throw 42P10)
INSERT INTO category_configs (category_name, size_units, default_unit, has_rolls, requires_case)
VALUES 
  ('CONTAINERS & CLOSURES', ARRAY['ml', 'oz', 'count'], 'count', false, true),
  ('RX LABELS', ARRAY['count', 'roll'], 'count', true, false),
  ('COMPLIANCE PACKAGING', ARRAY['count', 'pack'], 'count', false, true),
  ('RX PAPER BAGS', ARRAY['count', 'pack'], 'count', false, true),
  ('ORAL SYRINGES & ACCESSORIES', ARRAY['ml', 'count'], 'count', false, true),
  ('OTHER SUPPLY', ARRAY['count', 'box'], 'count', false, true)
ON CONFLICT (category_name) DO NOTHING;

INSERT INTO subcategory_configs (category_name, subcategory_name)
VALUES 
  ('CONTAINERS & CLOSURES', 'PUSH DOWN & TURN'),
  ('CONTAINERS & CLOSURES', 'THUMB – CLICK'),
  ('CONTAINERS & CLOSURES', 'LIQUID BOTTLES'),
  ('CONTAINERS & CLOSURES', 'OINTMENT JARS'),
  ('RX LABELS', 'DIRECT THERMAL RX LABELS'),
  ('RX LABELS', 'LASER LABELS'),
  ('COMPLIANCE PACKAGING', 'HEAT SEAL CARDS – SINGLE DOSE'),
  ('COMPLIANCE PACKAGING', 'COLD SEAL CARDS – SINGLE DOSE'),
  ('COMPLIANCE PACKAGING', 'BLISTERS – SINGLE DOSE'),
  ('COMPLIANCE PACKAGING', 'COLD SEAL LABELS – MULTI DOSE'),
  ('COMPLIANCE PACKAGING', 'BLISTERS – MULTI DOSE'),
  ('COMPLIANCE PACKAGING', 'COLD SEAL BLISTER & CARDS COMBO – MULTI DOSE'),
  ('RX PAPER BAGS', 'FLAT BOTTOM STOCK RX BAGS'),
  ('RX PAPER BAGS', 'SQUARE BOTTOM STOCK RX BAGS'),
  ('ORAL SYRINGES & ACCESSORIES', 'ORAL SYRINGES'),
  ('ORAL SYRINGES & ACCESSORIES', 'FITMENTS & ADAPTERS'),
  ('OTHER SUPPLY', 'MEDICINE SHIPPING SUPPLY'),
  ('OTHER SUPPLY', 'CORRUGATED BOXES')
ON CONFLICT (category_name, subcategory_name) DO NOTHING;














-- CONTAINERS & CLOSURES
INSERT INTO subcategory_configs (category_name, subcategory_name) VALUES
  ('CONTAINERS & CLOSURES', 'PUSH DOWN & TURN'),
  ('CONTAINERS & CLOSURES', 'THUMB – CLICK'),
  ('CONTAINERS & CLOSURES', 'LIQUID BOTTLES'),
  ('CONTAINERS & CLOSURES', 'OINTMENT JARS')
ON CONFLICT DO NOTHING;

-- RX LABELS
INSERT INTO subcategory_configs (category_name, subcategory_name) VALUES
  ('RX LABELS', 'DIRECT THERMAL RX LABELS'),
  ('RX LABELS', 'LASER LABELS')
ON CONFLICT DO NOTHING;

-- COMPLIANCE PACKAGING
INSERT INTO subcategory_configs (category_name, subcategory_name) VALUES
  ('COMPLIANCE PACKAGING', 'HEAT SEAL CARDS – SINGLE DOSE'),
  ('COMPLIANCE PACKAGING', 'COLD SEAL CARDS – SINGLE DOSE'),
  ('COMPLIANCE PACKAGING', 'BLISTERS – SINGLE DOSE'),
  ('COMPLIANCE PACKAGING', 'COLD SEAL LABELS – MULTI DOSE'),
  ('COMPLIANCE PACKAGING', 'BLISTERS – MULTI DOSE'),
  ('COMPLIANCE PACKAGING', 'COLD SEAL BLISTER & CARDS COMBO – MULTI DOSE')
ON CONFLICT DO NOTHING;

-- RX PAPER BAGS
INSERT INTO subcategory_configs (category_name, subcategory_name) VALUES
  ('RX PAPER BAGS', 'FLAT BOTTOM STOCK RX BAGS'),
  ('RX PAPER BAGS', 'SQUARE BOTTOM STOCK RX BAGS')
ON CONFLICT DO NOTHING;

-- ORAL SYRINGES & ACCESSORIES
INSERT INTO subcategory_configs (category_name, subcategory_name) VALUES
  ('ORAL SYRINGES & ACCESSORIES', 'ORAL SYRINGES'),
  ('ORAL SYRINGES & ACCESSORIES', 'FITMENTS & ADAPTERS')
ON CONFLICT DO NOTHING;

-- OTHER SUPPLY
INSERT INTO subcategory_configs (category_name, subcategory_name) VALUES
  ('OTHER SUPPLY', 'MEDICINE SHIPPING SUPPLY'),
  ('OTHER SUPPLY', 'CORRUGATED BOXES')
ON CONFLICT DO NOTHING;

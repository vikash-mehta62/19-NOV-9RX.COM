-- Add display_order column to category_configs
ALTER TABLE category_configs 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 999;

-- Set initial ordering to match current hardcoded CATEGORY_ORDER
UPDATE category_configs SET display_order = 1 WHERE category_name = 'CONTAINERS & CLOSURES';
UPDATE category_configs SET display_order = 2 WHERE category_name = 'RX LABELS';
UPDATE category_configs SET display_order = 3 WHERE category_name = 'COMPLIANCE PACKAGING';
UPDATE category_configs SET display_order = 4 WHERE category_name = 'RX PAPER BAGS';
UPDATE category_configs SET display_order = 5 WHERE category_name = 'ORAL SYRINGES & ACCESSORIES';
UPDATE category_configs SET display_order = 6 WHERE category_name = 'OTHER SUPPLY';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_category_configs_display_order ON category_configs(display_order);;

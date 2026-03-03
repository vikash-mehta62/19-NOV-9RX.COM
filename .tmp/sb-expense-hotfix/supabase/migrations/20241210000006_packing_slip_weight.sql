-- Add weight columns to product_sizes for packing slip calculations
ALTER TABLE product_sizes ADD COLUMN IF NOT EXISTS weight_per_case NUMERIC DEFAULT 0;
ALTER TABLE product_sizes ADD COLUMN IF NOT EXISTS weight_unit TEXT DEFAULT 'lbs';
-- Add comments for clarity
COMMENT ON COLUMN product_sizes.weight_per_case IS 'Weight of one master case in the specified unit';
COMMENT ON COLUMN product_sizes.weight_unit IS 'Weight unit: lbs or kg';

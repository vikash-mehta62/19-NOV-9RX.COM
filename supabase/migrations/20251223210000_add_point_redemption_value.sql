-- Add point_redemption_value to rewards_config
-- This is the dollar value per point when redeeming (default: $0.01 per point = 100 points = $1)
ALTER TABLE rewards_config ADD COLUMN IF NOT EXISTS point_redemption_value numeric(10,4) DEFAULT 0.01;

-- Update existing config with default value
UPDATE rewards_config SET point_redemption_value = 0.01 WHERE point_redemption_value IS NULL;

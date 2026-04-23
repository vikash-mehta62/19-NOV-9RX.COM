-- Revert Banner Management Changes
-- Run this to remove the columns added by FIX_BANNER_COLUMNS.sql
-- WARNING: This will delete data in these columns!

-- Drop the index first
DROP INDEX IF EXISTS idx_banners_targeting;

-- Remove targeting columns
ALTER TABLE banners DROP COLUMN IF EXISTS target_user_types;
ALTER TABLE banners DROP COLUMN IF EXISTS target_devices;
ALTER TABLE banners DROP COLUMN IF EXISTS target_locations;
ALTER TABLE banners DROP COLUMN IF EXISTS target_time_start;
ALTER TABLE banners DROP COLUMN IF EXISTS target_time_end;

-- Remove design columns
ALTER TABLE banners DROP COLUMN IF EXISTS mobile_image_url;
ALTER TABLE banners DROP COLUMN IF EXISTS banner_type;
ALTER TABLE banners DROP COLUMN IF EXISTS background_color;
ALTER TABLE banners DROP COLUMN IF EXISTS text_color;
ALTER TABLE banners DROP COLUMN IF EXISTS overlay_opacity;
ALTER TABLE banners DROP COLUMN IF EXISTS target_page;
ALTER TABLE banners DROP COLUMN IF EXISTS click_count;
ALTER TABLE banners DROP COLUMN IF EXISTS view_count;

-- Remove A/B testing columns
ALTER TABLE banners DROP COLUMN IF EXISTS ab_test_group;
ALTER TABLE banners DROP COLUMN IF EXISTS ab_test_id;
ALTER TABLE banners DROP COLUMN IF EXISTS ab_test_traffic_split;

-- Remove festival theme column
ALTER TABLE banners DROP COLUMN IF EXISTS festival_theme;

-- Verify columns were removed
SELECT 
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_name = 'banners'
ORDER BY ordinal_position;

-- Success message
SELECT 'Banner columns reverted successfully!' as status;

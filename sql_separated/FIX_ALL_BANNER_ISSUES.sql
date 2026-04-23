-- ⚡ SINGLE FIX FOR ALL BANNER ERRORS
-- This script safely adds ONLY missing columns (won't re-add existing ones)
-- Copy ALL of this and run in Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/qiaetxkxweghuoxyhvml/editor

-- Add targeting columns (only if they don't exist)
ALTER TABLE banners ADD COLUMN IF NOT EXISTS target_user_types TEXT[] DEFAULT ARRAY['all'];
ALTER TABLE banners ADD COLUMN IF NOT EXISTS target_devices TEXT[] DEFAULT ARRAY['all'];
ALTER TABLE banners ADD COLUMN IF NOT EXISTS target_locations TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE banners ADD COLUMN IF NOT EXISTS target_time_start TIME;
ALTER TABLE banners ADD COLUMN IF NOT EXISTS target_time_end TIME;

-- Add design columns (only if they don't exist)
ALTER TABLE banners ADD COLUMN IF NOT EXISTS mobile_image_url TEXT;
ALTER TABLE banners ADD COLUMN IF NOT EXISTS banner_type VARCHAR(50) DEFAULT 'hero';
ALTER TABLE banners ADD COLUMN IF NOT EXISTS background_color VARCHAR(20) DEFAULT '#000000';
ALTER TABLE banners ADD COLUMN IF NOT EXISTS text_color VARCHAR(20) DEFAULT '#FFFFFF';
ALTER TABLE banners ADD COLUMN IF NOT EXISTS overlay_opacity DECIMAL(3,2) DEFAULT 0.3;
ALTER TABLE banners ADD COLUMN IF NOT EXISTS target_page VARCHAR(255);

-- Add analytics columns (only if they don't exist)
ALTER TABLE banners ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0;
ALTER TABLE banners ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Add A/B testing columns (only if they don't exist)
ALTER TABLE banners ADD COLUMN IF NOT EXISTS ab_test_group VARCHAR(10) DEFAULT 'A';
ALTER TABLE banners ADD COLUMN IF NOT EXISTS ab_test_id UUID;
ALTER TABLE banners ADD COLUMN IF NOT EXISTS ab_test_traffic_split DECIMAL(3,2) DEFAULT 0.5;

-- Add festival theme column (only if it doesn't exist)
ALTER TABLE banners ADD COLUMN IF NOT EXISTS festival_theme VARCHAR(100);

-- Update existing banners with default values (only where NULL)
UPDATE banners 
SET 
    target_user_types = COALESCE(target_user_types, ARRAY['all']),
    target_devices = COALESCE(target_devices, ARRAY['all']),
    target_locations = COALESCE(target_locations, ARRAY[]::TEXT[]),
    banner_type = COALESCE(banner_type, 'hero'),
    background_color = COALESCE(background_color, '#000000'),
    text_color = COALESCE(text_color, '#FFFFFF'),
    overlay_opacity = COALESCE(overlay_opacity, 0.3),
    view_count = COALESCE(view_count, 0),
    click_count = COALESCE(click_count, 0)
WHERE 
    target_user_types IS NULL 
    OR target_devices IS NULL
    OR banner_type IS NULL;

-- Create index for better performance (only if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_banners_targeting ON banners(target_user_types, target_devices, is_active);

-- ✅ VERIFICATION: Check which columns were added
SELECT 
    column_name, 
    data_type, 
    column_default,
    CASE 
        WHEN column_name IN (
            'target_user_types', 'target_devices', 'target_locations',
            'target_time_start', 'target_time_end', 'mobile_image_url',
            'banner_type', 'background_color', 'text_color', 'overlay_opacity',
            'target_page', 'view_count', 'click_count', 'ab_test_group',
            'ab_test_id', 'ab_test_traffic_split', 'festival_theme'
        ) THEN '✅ NEW'
        ELSE 'Original'
    END as status
FROM information_schema.columns 
WHERE table_name = 'banners'
ORDER BY 
    CASE 
        WHEN column_name IN (
            'target_user_types', 'target_devices', 'target_locations',
            'target_time_start', 'target_time_end', 'mobile_image_url',
            'banner_type', 'background_color', 'text_color', 'overlay_opacity',
            'target_page', 'view_count', 'click_count', 'ab_test_group',
            'ab_test_id', 'ab_test_traffic_split', 'festival_theme'
        ) THEN 0 
        ELSE 1 
    END,
    column_name;

-- ✅ SUCCESS! 
-- If you see columns marked "✅ NEW" above, they were just added.
-- Now refresh your app (Ctrl+Shift+R) and try creating banners again!

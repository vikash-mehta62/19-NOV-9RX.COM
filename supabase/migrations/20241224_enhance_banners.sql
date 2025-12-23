-- Enhance banners table with additional features

-- Add banner type/position column
ALTER TABLE banners ADD COLUMN IF NOT EXISTS banner_type VARCHAR(50) DEFAULT 'hero' 
  CHECK (banner_type IN ('hero', 'sidebar', 'popup', 'strip', 'category', 'product'));
-- Add background color for text overlays
ALTER TABLE banners ADD COLUMN IF NOT EXISTS background_color VARCHAR(20) DEFAULT '#000000';
ALTER TABLE banners ADD COLUMN IF NOT EXISTS text_color VARCHAR(20) DEFAULT '#FFFFFF';
-- Add overlay opacity for better text readability
ALTER TABLE banners ADD COLUMN IF NOT EXISTS overlay_opacity DECIMAL(3,2) DEFAULT 0.3;
-- Add target page
ALTER TABLE banners ADD COLUMN IF NOT EXISTS target_page VARCHAR(100);
-- Add click tracking
ALTER TABLE banners ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0;
ALTER TABLE banners ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
-- Add mobile-specific image
ALTER TABLE banners ADD COLUMN IF NOT EXISTS mobile_image_url TEXT;
-- Create index for banner type
CREATE INDEX IF NOT EXISTS idx_banners_type ON banners(banner_type, is_active);
-- Function to increment banner click count
CREATE OR REPLACE FUNCTION increment_banner_click(p_banner_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE banners SET click_count = click_count + 1 WHERE id = p_banner_id;
END;
$$ LANGUAGE plpgsql;
-- Function to increment banner view count
CREATE OR REPLACE FUNCTION increment_banner_view(p_banner_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE banners SET view_count = view_count + 1 WHERE id = p_banner_id;
END;
$$ LANGUAGE plpgsql;

-- Marketing & Promotion Management Tables
-- Created: 2024-12-10

-- =============================================
-- 1. BANNERS TABLE - Homepage banners/sliders
-- =============================================
CREATE TABLE IF NOT EXISTS banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(500),
    image_url TEXT NOT NULL,
    link_url TEXT,
    link_text VARCHAR(100),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);
-- =============================================
-- 2. OFFERS TABLE - Discounts & Promo Codes
-- =============================================
CREATE TABLE IF NOT EXISTS offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    offer_type VARCHAR(50) NOT NULL CHECK (offer_type IN ('percentage', 'flat', 'buy_get', 'free_shipping')),
    discount_value DECIMAL(10,2),
    min_order_amount DECIMAL(10,2),
    max_discount_amount DECIMAL(10,2),
    promo_code VARCHAR(50) UNIQUE,
    usage_limit INTEGER,
    used_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    applicable_to VARCHAR(50) DEFAULT 'all' CHECK (applicable_to IN ('all', 'category', 'product', 'user_group')),
    applicable_ids TEXT[], -- Array of category/product/group IDs
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);
-- =============================================
-- 3. BLOGS TABLE - Blog Posts/Articles
-- =============================================
CREATE TABLE IF NOT EXISTS blogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    featured_image TEXT,
    category VARCHAR(100),
    tags TEXT[],
    author_name VARCHAR(255),
    is_published BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);
-- =============================================
-- 4. ANNOUNCEMENTS TABLE - Important Notices
-- =============================================
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    announcement_type VARCHAR(50) DEFAULT 'info' CHECK (announcement_type IN ('info', 'warning', 'success', 'error', 'promo')),
    display_type VARCHAR(50) DEFAULT 'banner' CHECK (display_type IN ('banner', 'popup', 'toast')),
    target_audience VARCHAR(50) DEFAULT 'all' CHECK (target_audience IN ('all', 'pharmacy', 'group', 'hospital', 'admin')),
    link_url TEXT,
    link_text VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    is_dismissible BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);
-- =============================================
-- INDEXES for better performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_banners_active ON banners(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_banners_dates ON banners(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_offers_active ON offers(is_active, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_offers_promo_code ON offers(promo_code);
CREATE INDEX IF NOT EXISTS idx_blogs_published ON blogs(is_published, published_at);
CREATE INDEX IF NOT EXISTS idx_blogs_slug ON blogs(slug);
CREATE INDEX IF NOT EXISTS idx_blogs_featured ON blogs(is_featured);
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active, priority);
CREATE INDEX IF NOT EXISTS idx_announcements_audience ON announcements(target_audience);
-- =============================================
-- RLS Policies
-- =============================================
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE blogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
-- Banners: Everyone can read active, admins can manage
CREATE POLICY "Anyone can view active banners" ON banners FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage banners" ON banners FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
-- Offers: Everyone can read active, admins can manage
CREATE POLICY "Anyone can view active offers" ON offers FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage offers" ON offers FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
-- Blogs: Everyone can read published, admins can manage
CREATE POLICY "Anyone can view published blogs" ON blogs FOR SELECT USING (is_published = true);
CREATE POLICY "Admins can manage blogs" ON blogs FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
-- Announcements: Based on target audience, admins can manage
CREATE POLICY "Users can view relevant announcements" ON announcements FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage announcements" ON announcements FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
-- =============================================
-- Updated_at trigger function
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';
-- Apply triggers
DROP TRIGGER IF EXISTS update_banners_updated_at ON banners;
CREATE TRIGGER update_banners_updated_at BEFORE UPDATE ON banners FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_offers_updated_at ON offers;
CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON offers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_blogs_updated_at ON blogs;
CREATE TRIGGER update_blogs_updated_at BEFORE UPDATE ON blogs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_announcements_updated_at ON announcements;
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

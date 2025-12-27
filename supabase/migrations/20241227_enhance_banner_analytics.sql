-- Enhanced Banner Analytics and A/B Testing
-- Created: 2024-12-27

-- =============================================
-- 1. BANNER ANALYTICS TABLE - Track detailed metrics
-- =============================================
CREATE TABLE IF NOT EXISTS banner_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    banner_id UUID REFERENCES banners(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    views INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    unique_views INTEGER DEFAULT 0,
    unique_clicks INTEGER DEFAULT 0,
    user_type VARCHAR(50), -- 'pharmacy', 'hospital', 'group', 'admin'
    device_type VARCHAR(20), -- 'desktop', 'mobile', 'tablet'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(banner_id, date, user_type, device_type)
);

-- =============================================
-- 2. A/B TESTING SUPPORT
-- =============================================
-- Add A/B testing fields to banners table
ALTER TABLE banners ADD COLUMN IF NOT EXISTS ab_test_group VARCHAR(10) DEFAULT 'A' CHECK (ab_test_group IN ('A', 'B'));
ALTER TABLE banners ADD COLUMN IF NOT EXISTS ab_test_id UUID;
ALTER TABLE banners ADD COLUMN IF NOT EXISTS ab_test_traffic_split DECIMAL(3,2) DEFAULT 0.5; -- 0.5 = 50/50 split

-- A/B Test configurations
CREATE TABLE IF NOT EXISTS ab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    banner_a_id UUID REFERENCES banners(id) ON DELETE CASCADE,
    banner_b_id UUID REFERENCES banners(id) ON DELETE CASCADE,
    traffic_split DECIMAL(3,2) DEFAULT 0.5,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed')),
    winner VARCHAR(1) CHECK (winner IN ('A', 'B')),
    confidence_level DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- =============================================
-- 3. USER TARGETING SUPPORT
-- =============================================
-- Add targeting fields to banners table
ALTER TABLE banners ADD COLUMN IF NOT EXISTS target_user_types TEXT[] DEFAULT ARRAY['all']; -- ['pharmacy', 'hospital', 'group', 'admin']
ALTER TABLE banners ADD COLUMN IF NOT EXISTS target_devices TEXT[] DEFAULT ARRAY['all']; -- ['desktop', 'mobile', 'tablet']
ALTER TABLE banners ADD COLUMN IF NOT EXISTS target_locations TEXT[]; -- ['US', 'CA', 'UK'] - country codes
ALTER TABLE banners ADD COLUMN IF NOT EXISTS target_time_start TIME;
ALTER TABLE banners ADD COLUMN IF NOT EXISTS target_time_end TIME;

-- =============================================
-- 4. BANNER IMPRESSIONS - Real-time tracking
-- =============================================
CREATE TABLE IF NOT EXISTS banner_impressions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    banner_id UUID REFERENCES banners(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    session_id VARCHAR(255),
    user_type VARCHAR(50),
    device_type VARCHAR(20),
    ip_address INET,
    user_agent TEXT,
    page_url TEXT,
    action_type VARCHAR(20) CHECK (action_type IN ('view', 'click')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 5. INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_banner_analytics_date ON banner_analytics(date DESC);
CREATE INDEX IF NOT EXISTS idx_banner_analytics_banner_id ON banner_analytics(banner_id);
CREATE INDEX IF NOT EXISTS idx_banner_impressions_banner_id ON banner_impressions(banner_id);
CREATE INDEX IF NOT EXISTS idx_banner_impressions_created_at ON banner_impressions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_banners_targeting ON banners(target_user_types, target_devices, is_active);
CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_tests(status, start_date, end_date);

-- =============================================
-- 6. ANALYTICS FUNCTIONS
-- =============================================

-- Function to record banner impression
CREATE OR REPLACE FUNCTION record_banner_impression(
    p_banner_id UUID,
    p_user_id UUID DEFAULT NULL,
    p_session_id VARCHAR DEFAULT NULL,
    p_user_type VARCHAR DEFAULT 'guest',
    p_device_type VARCHAR DEFAULT 'desktop',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_page_url TEXT DEFAULT NULL,
    p_action_type VARCHAR DEFAULT 'view'
)
RETURNS VOID AS $$
BEGIN
    -- Insert impression record
    INSERT INTO banner_impressions (
        banner_id, user_id, session_id, user_type, device_type, 
        ip_address, user_agent, page_url, action_type
    ) VALUES (
        p_banner_id, p_user_id, p_session_id, p_user_type, p_device_type,
        p_ip_address, p_user_agent, p_page_url, p_action_type
    );

    -- Update daily analytics
    INSERT INTO banner_analytics (banner_id, date, user_type, device_type, views, clicks, unique_views, unique_clicks)
    VALUES (
        p_banner_id, 
        CURRENT_DATE, 
        p_user_type, 
        p_device_type,
        CASE WHEN p_action_type = 'view' THEN 1 ELSE 0 END,
        CASE WHEN p_action_type = 'click' THEN 1 ELSE 0 END,
        0, -- Will be calculated separately
        0  -- Will be calculated separately
    )
    ON CONFLICT (banner_id, date, user_type, device_type) 
    DO UPDATE SET
        views = banner_analytics.views + CASE WHEN p_action_type = 'view' THEN 1 ELSE 0 END,
        clicks = banner_analytics.clicks + CASE WHEN p_action_type = 'click' THEN 1 ELSE 0 END;

    -- Update banner counters for backward compatibility
    IF p_action_type = 'view' THEN
        UPDATE banners SET view_count = view_count + 1 WHERE id = p_banner_id;
    ELSIF p_action_type = 'click' THEN
        UPDATE banners SET click_count = click_count + 1 WHERE id = p_banner_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get banner analytics
CREATE OR REPLACE FUNCTION get_banner_analytics(
    p_banner_id UUID DEFAULT NULL,
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    banner_id UUID,
    banner_title VARCHAR,
    date DATE,
    total_views BIGINT,
    total_clicks BIGINT,
    ctr DECIMAL,
    user_type VARCHAR,
    device_type VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ba.banner_id,
        b.title,
        ba.date,
        SUM(ba.views) as total_views,
        SUM(ba.clicks) as total_clicks,
        CASE 
            WHEN SUM(ba.views) > 0 THEN ROUND((SUM(ba.clicks)::DECIMAL / SUM(ba.views)) * 100, 2)
            ELSE 0
        END as ctr,
        ba.user_type,
        ba.device_type
    FROM banner_analytics ba
    JOIN banners b ON ba.banner_id = b.id
    WHERE 
        (p_banner_id IS NULL OR ba.banner_id = p_banner_id)
        AND ba.date BETWEEN p_start_date AND p_end_date
    GROUP BY ba.banner_id, b.title, ba.date, ba.user_type, ba.device_type
    ORDER BY ba.date DESC, total_views DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get A/B test results
CREATE OR REPLACE FUNCTION get_ab_test_results(p_test_id UUID)
RETURNS TABLE (
    test_name VARCHAR,
    banner_a_title VARCHAR,
    banner_b_title VARCHAR,
    banner_a_views BIGINT,
    banner_a_clicks BIGINT,
    banner_a_ctr DECIMAL,
    banner_b_views BIGINT,
    banner_b_clicks BIGINT,
    banner_b_ctr DECIMAL,
    statistical_significance DECIMAL
) AS $$
DECLARE
    test_record ab_tests%ROWTYPE;
    a_views BIGINT;
    a_clicks BIGINT;
    b_views BIGINT;
    b_clicks BIGINT;
BEGIN
    -- Get test details
    SELECT * INTO test_record FROM ab_tests WHERE id = p_test_id;
    
    -- Get banner A stats
    SELECT COALESCE(SUM(views), 0), COALESCE(SUM(clicks), 0)
    INTO a_views, a_clicks
    FROM banner_analytics ba
    WHERE ba.banner_id = test_record.banner_a_id
    AND ba.date BETWEEN test_record.start_date::DATE AND COALESCE(test_record.end_date::DATE, CURRENT_DATE);
    
    -- Get banner B stats
    SELECT COALESCE(SUM(views), 0), COALESCE(SUM(clicks), 0)
    INTO b_views, b_clicks
    FROM banner_analytics ba
    WHERE ba.banner_id = test_record.banner_b_id
    AND ba.date BETWEEN test_record.start_date::DATE AND COALESCE(test_record.end_date::DATE, CURRENT_DATE);
    
    RETURN QUERY
    SELECT 
        test_record.name,
        ba.title as banner_a_title,
        bb.title as banner_b_title,
        a_views,
        a_clicks,
        CASE WHEN a_views > 0 THEN ROUND((a_clicks::DECIMAL / a_views) * 100, 2) ELSE 0 END,
        b_views,
        b_clicks,
        CASE WHEN b_views > 0 THEN ROUND((b_clicks::DECIMAL / b_views) * 100, 2) ELSE 0 END,
        -- Simple statistical significance calculation (placeholder)
        CASE 
            WHEN a_views > 100 AND b_views > 100 THEN 95.0
            WHEN a_views > 50 AND b_views > 50 THEN 85.0
            ELSE 0.0
        END as statistical_significance
    FROM banners ba, banners bb
    WHERE ba.id = test_record.banner_a_id AND bb.id = test_record.banner_b_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 7. RLS POLICIES
-- =============================================

-- Enable RLS
ALTER TABLE banner_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE banner_impressions ENABLE ROW LEVEL SECURITY;

-- Policies for banner_analytics (admin only)
CREATE POLICY "Admin can view all banner analytics" ON banner_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.type = 'admin'
        )
    );

-- Policies for ab_tests (admin only)
CREATE POLICY "Admin can manage A/B tests" ON ab_tests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.type = 'admin'
        )
    );

-- Policies for banner_impressions (allow inserts for tracking)
CREATE POLICY "Anyone can record banner impressions" ON banner_impressions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin can view banner impressions" ON banner_impressions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.type = 'admin'
        )
    );
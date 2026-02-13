-- =====================================================
-- ENHANCEMENT SYSTEM MIGRATION
-- Week 7-8: Dark Mode, Onboarding, Help, Charts, Search
-- =====================================================

-- =====================================================
-- 1. USER PREFERENCES (Dark Mode, Settings)
-- =====================================================

CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  theme TEXT DEFAULT 'light', -- 'light', 'dark', 'auto'
  language TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'UTC',
  notifications_enabled BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  dashboard_layout JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. ONBOARDING SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS onboarding_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL, -- 'admin', 'pharmacy', 'group', 'hospital'
  step_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  action_url TEXT,
  action_label TEXT,
  is_required BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, step_order)
);

CREATE TABLE IF NOT EXISTS user_onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  step_id UUID REFERENCES onboarding_steps(id) ON DELETE CASCADE,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  skipped BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, step_id)
);

-- =====================================================
-- 3. HELP SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS help_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL, -- 'getting_started', 'orders', 'products', 'reports', etc.
  role TEXT[], -- ['admin', 'pharmacy', 'group'] - who can see this
  tags TEXT[],
  is_published BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS help_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES help_articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  is_helpful BOOLEAN,
  feedback_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. CUSTOM DASHBOARDS
-- =====================================================

CREATE TABLE IF NOT EXISTS custom_dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  layout JSONB NOT NULL, -- widget positions and configurations
  is_default BOOLEAN DEFAULT false,
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_type TEXT NOT NULL, -- 'chart', 'stat', 'table', 'list'
  name TEXT NOT NULL,
  description TEXT,
  config_schema JSONB, -- JSON schema for widget configuration
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. SAVED SEARCHES & FILTERS
-- =====================================================

CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'products', 'orders', 'customers'
  search_query TEXT,
  filters JSONB NOT NULL,
  is_favorite BOOLEAN DEFAULT false,
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 6. SEARCH HISTORY
-- =====================================================

CREATE TABLE IF NOT EXISTS search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  search_query TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  result_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 7. INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user ON user_onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_help_articles_category ON help_articles(category);
CREATE INDEX IF NOT EXISTS idx_help_articles_role ON help_articles USING GIN(role);
CREATE INDEX IF NOT EXISTS idx_custom_dashboards_user ON custom_dashboards(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_created ON search_history(created_at DESC);

-- =====================================================
-- 8. INSERT DEFAULT ONBOARDING STEPS
-- =====================================================

-- Admin onboarding
INSERT INTO onboarding_steps (role, step_order, title, description, action_url, action_label, is_required) VALUES
  ('admin', 1, 'Welcome to 9RX Admin', 'Get started with your admin dashboard', '/admin/dashboard', 'View Dashboard', true),
  ('admin', 2, 'Add Your First Product', 'Start building your product catalog', '/admin/products', 'Add Product', true),
  ('admin', 3, 'Configure Settings', 'Set up your store preferences', '/admin/settings', 'Go to Settings', false),
  ('admin', 4, 'Explore Analytics', 'View business insights and reports', '/admin/analytics', 'View Analytics', false),
  ('admin', 5, 'Set Up Automation', 'Automate repetitive tasks', '/admin/automation', 'Configure Automation', false)
ON CONFLICT (role, step_order) DO NOTHING;

-- Pharmacy onboarding
INSERT INTO onboarding_steps (role, step_order, title, description, action_url, action_label, is_required) VALUES
  ('pharmacy', 1, 'Welcome to 9RX', 'Your medical supply partner', '/pharmacy/products', 'Browse Products', true),
  ('pharmacy', 2, 'Place Your First Order', 'Start ordering products', '/pharmacy/order/create', 'Create Order', true),
  ('pharmacy', 3, 'Set Up Payment Method', 'Add your payment information', '/pharmacy/payment-methods', 'Add Payment', false),
  ('pharmacy', 4, 'Explore Deals', 'Check out daily deals and offers', '/pharmacy/deals', 'View Deals', false)
ON CONFLICT (role, step_order) DO NOTHING;

-- =====================================================
-- 9. INSERT DEFAULT HELP ARTICLES
-- =====================================================

INSERT INTO help_articles (title, content, category, role, tags) VALUES
  (
    'Getting Started with 9RX',
    'Welcome to 9RX! This guide will help you get started with our platform...',
    'getting_started',
    ARRAY['admin', 'pharmacy', 'group'],
    ARRAY['basics', 'introduction']
  ),
  (
    'How to Create an Order',
    'Learn how to create and manage orders in the system...',
    'orders',
    ARRAY['admin', 'pharmacy', 'group'],
    ARRAY['orders', 'tutorial']
  ),
  (
    'Managing Products',
    'Complete guide to adding and managing products...',
    'products',
    ARRAY['admin'],
    ARRAY['products', 'inventory']
  ),
  (
    'Understanding Analytics',
    'Learn how to read and use analytics data...',
    'reports',
    ARRAY['admin', 'group'],
    ARRAY['analytics', 'reports']
  ),
  (
    'Setting Up Automation',
    'Automate your workflow with automation rules...',
    'automation',
    ARRAY['admin'],
    ARRAY['automation', 'advanced']
  )
ON CONFLICT DO NOTHING;

-- =====================================================
-- 10. RLS POLICIES
-- =====================================================

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

-- User preferences policies
CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Onboarding policies
CREATE POLICY "Users can view own onboarding progress"
  ON user_onboarding_progress FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own onboarding progress"
  ON user_onboarding_progress FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Help articles policies
CREATE POLICY "Users can view published help articles"
  ON help_articles FOR SELECT
  TO authenticated
  USING (
    is_published = true
    AND (
      role IS NULL 
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = ANY(help_articles.role)
      )
    )
  );

-- Custom dashboards policies
CREATE POLICY "Users can manage own dashboards"
  ON custom_dashboards FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Saved searches policies
CREATE POLICY "Users can manage own searches"
  ON saved_searches FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Search history policies
CREATE POLICY "Users can view own search history"
  ON search_history FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- =====================================================
-- COMPLETE
-- =====================================================

COMMENT ON TABLE user_preferences IS 'User-specific preferences including theme and settings';
COMMENT ON TABLE onboarding_steps IS 'Onboarding steps for different user roles';
COMMENT ON TABLE help_articles IS 'Help documentation and guides';
COMMENT ON TABLE custom_dashboards IS 'User-created custom dashboard layouts';
COMMENT ON TABLE saved_searches IS 'Saved search queries and filters';

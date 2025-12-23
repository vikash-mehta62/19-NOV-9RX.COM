-- Email Marketing System Improvements
-- 1. Subscriber Management
-- 2. Email Queue
-- 3. A/B Testing
-- 4. Tracking & Analytics
-- 5. Webhook handling

-- ============================================
-- 1. EMAIL SUBSCRIBERS & PREFERENCES
-- ============================================

CREATE TABLE IF NOT EXISTS email_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed', 'bounced', 'complained', 'suppressed')),
    source VARCHAR(50) DEFAULT 'signup', -- signup, import, manual, api
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    unsubscribed_at TIMESTAMP WITH TIME ZONE,
    bounce_count INT DEFAULT 0,
    last_bounce_at TIMESTAMP WITH TIME ZONE,
    complaint_at TIMESTAMP WITH TIME ZONE,
    tags TEXT[] DEFAULT '{}',
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS email_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscriber_id UUID REFERENCES email_subscribers(id) ON DELETE CASCADE,
    preference_type VARCHAR(50) NOT NULL, -- marketing, transactional, newsletter, promotional
    is_enabled BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(subscriber_id, preference_type)
);
CREATE TABLE IF NOT EXISTS email_suppression_list (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('unsubscribe', 'bounce', 'complaint', 'manual', 'invalid')),
    source VARCHAR(100), -- campaign_id, automation_id, manual
    suppressed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);
-- ============================================
-- 2. EMAIL QUEUE SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscriber_id UUID REFERENCES email_subscribers(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    from_email VARCHAR(255),
    from_name VARCHAR(100),
    reply_to VARCHAR(255),
    
    -- Source tracking
    campaign_id UUID REFERENCES email_campaigns(id) ON DELETE SET NULL,
    automation_id UUID REFERENCES email_automations(id) ON DELETE SET NULL,
    template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
    
    -- Queue management
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
    priority INT DEFAULT 0, -- Higher = more priority
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Retry logic
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    
    -- Results
    sent_at TIMESTAMP WITH TIME ZONE,
    provider_message_id VARCHAR(255),
    error_message TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Index for queue processing
CREATE INDEX IF NOT EXISTS idx_email_queue_status_scheduled ON email_queue(status, scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_email_queue_retry ON email_queue(status, next_retry_at) WHERE status = 'failed' AND attempts < max_attempts;
-- ============================================
-- 3. A/B TESTING
-- ============================================

CREATE TABLE IF NOT EXISTS email_ab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    test_type VARCHAR(20) NOT NULL CHECK (test_type IN ('subject', 'content', 'from_name', 'send_time')),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'completed', 'cancelled')),
    
    -- Test configuration
    variant_a JSONB NOT NULL, -- {subject: "...", content: "...", etc}
    variant_b JSONB NOT NULL,
    split_percentage INT DEFAULT 50, -- % going to variant A
    
    -- Sample size
    test_sample_size INT DEFAULT 1000, -- Number of recipients for test
    winner_criteria VARCHAR(20) DEFAULT 'open_rate' CHECK (winner_criteria IN ('open_rate', 'click_rate', 'conversion')),
    auto_send_winner BOOLEAN DEFAULT true,
    test_duration_hours INT DEFAULT 4, -- Hours before picking winner
    
    -- Results
    variant_a_sent INT DEFAULT 0,
    variant_a_opens INT DEFAULT 0,
    variant_a_clicks INT DEFAULT 0,
    variant_b_sent INT DEFAULT 0,
    variant_b_opens INT DEFAULT 0,
    variant_b_clicks INT DEFAULT 0,
    winner VARCHAR(1), -- 'A' or 'B'
    
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- ============================================
-- 4. EMAIL TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS email_tracking_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_log_id UUID REFERENCES email_logs(id) ON DELETE CASCADE,
    tracking_id UUID NOT NULL, -- Unique ID embedded in email
    event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed')),
    
    -- Event details
    link_url TEXT, -- For click events
    link_id VARCHAR(50), -- Identifier for the link
    user_agent TEXT,
    ip_address VARCHAR(45),
    device_type VARCHAR(20), -- desktop, mobile, tablet
    email_client VARCHAR(50), -- gmail, outlook, apple_mail, etc
    
    -- Location (from IP)
    country VARCHAR(2),
    region VARCHAR(100),
    city VARCHAR(100),
    
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tracking_events_log ON email_tracking_events(email_log_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_tracking_id ON email_tracking_events(tracking_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_type ON email_tracking_events(event_type, occurred_at);
-- Add tracking_id to email_logs
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS tracking_id UUID DEFAULT gen_random_uuid();
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS ab_test_id UUID REFERENCES email_ab_tests(id);
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS ab_variant VARCHAR(1);
-- ============================================
-- 5. AUTOMATION EXECUTION TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS automation_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id UUID REFERENCES email_automations(id) ON DELETE CASCADE,
    subscriber_id UUID REFERENCES email_subscribers(id) ON DELETE SET NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    trigger_data JSONB, -- Data that triggered the automation
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
    
    -- Execution details
    email_queue_id UUID REFERENCES email_queue(id),
    skip_reason TEXT, -- Why it was skipped (cooldown, limit, suppressed, etc)
    
    executed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_automation_exec_automation ON automation_executions(automation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_automation_exec_user ON automation_executions(user_id, automation_id);
-- ============================================
-- 6. WEBHOOK EVENTS LOG
-- ============================================

CREATE TABLE IF NOT EXISTS email_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL, -- resend, sendgrid, ses
    event_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    
    -- Parsed data
    email VARCHAR(255),
    message_id VARCHAR(255),
    
    -- Processing
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON email_webhook_events(processed, received_at) WHERE processed = false;
-- ============================================
-- 7. UPDATE EXISTING TABLES
-- ============================================

-- Add unsubscribe token to campaigns
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS unsubscribe_token UUID DEFAULT gen_random_uuid();
-- Add tracking settings to campaigns
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS track_opens BOOLEAN DEFAULT true;
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS track_clicks BOOLEAN DEFAULT true;
-- Add A/B test reference
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS ab_test_id UUID REFERENCES email_ab_tests(id);
-- ============================================
-- 8. HELPER FUNCTIONS
-- ============================================

-- Function to check if email is suppressed
CREATE OR REPLACE FUNCTION is_email_suppressed(check_email VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM email_suppression_list WHERE email = LOWER(check_email)
    );
END;
$$ LANGUAGE plpgsql;
-- Function to get subscriber status
CREATE OR REPLACE FUNCTION get_subscriber_status(check_email VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    sub_status VARCHAR;
BEGIN
    SELECT status INTO sub_status FROM email_subscribers WHERE email = LOWER(check_email);
    RETURN COALESCE(sub_status, 'unknown');
END;
$$ LANGUAGE plpgsql;
-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_email_subscribers_updated_at ON email_subscribers;
CREATE TRIGGER update_email_subscribers_updated_at
    BEFORE UPDATE ON email_subscribers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_email_queue_updated_at ON email_queue;
CREATE TRIGGER update_email_queue_updated_at
    BEFORE UPDATE ON email_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

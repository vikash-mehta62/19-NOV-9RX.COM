-- Email Marketing & Automation System
-- Created: 2024-12-10

-- =============================================
-- 1. EMAIL TEMPLATES - Reusable email designs
-- =============================================
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    template_type VARCHAR(50) NOT NULL CHECK (template_type IN (
        'welcome', 'abandoned_cart', 'order_confirmation', 'order_shipped', 
        'order_delivered', 'promotional', 'newsletter', 'restock_reminder',
        'inactive_user', 'product_spotlight', 'feedback', 'custom'
    )),
    html_content TEXT NOT NULL,
    text_content TEXT,
    variables TEXT[], -- Available merge tags like {{user_name}}, {{product_name}}
    preview_text VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);
-- =============================================
-- 2. EMAIL CAMPAIGNS - Bulk email campaigns
-- =============================================
CREATE TABLE IF NOT EXISTS email_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    template_id UUID REFERENCES email_templates(id),
    html_content TEXT,
    campaign_type VARCHAR(50) NOT NULL CHECK (campaign_type IN (
        'promotional', 'newsletter', 'product_launch', 'announcement', 
        'survey', 'educational', 'seasonal', 'custom'
    )),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled')),
    target_audience JSONB DEFAULT '{"type": "all"}', -- Filter criteria
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    open_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    bounce_count INTEGER DEFAULT 0,
    unsubscribe_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);
-- =============================================
-- 3. EMAIL AUTOMATIONS - Trigger-based emails
-- =============================================
CREATE TABLE IF NOT EXISTS email_automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN (
        'abandoned_cart', 'welcome', 'order_placed', 'order_shipped',
        'order_delivered', 'inactive_user', 'restock_reminder', 
        'birthday', 'signup_anniversary', 'first_purchase', 'custom'
    )),
    trigger_conditions JSONB DEFAULT '{}', -- e.g., {"delay_hours": 24, "min_cart_value": 50}
    template_id UUID REFERENCES email_templates(id),
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    send_limit_per_user INTEGER DEFAULT 1, -- How many times to send per user
    cooldown_days INTEGER DEFAULT 7, -- Days before sending again
    total_sent INTEGER DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);
-- =============================================
-- 4. EMAIL LOGS - Track all sent emails
-- =============================================
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    email_address VARCHAR(255) NOT NULL,
    campaign_id UUID REFERENCES email_campaigns(id),
    automation_id UUID REFERENCES email_automations(id),
    template_id UUID REFERENCES email_templates(id),
    subject VARCHAR(500),
    email_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'unsubscribed')),
    provider_message_id VARCHAR(255),
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    sent_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- =============================================
-- 5. ABANDONED CARTS - Track cart abandonment
-- =============================================
CREATE TABLE IF NOT EXISTS abandoned_carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    cart_data JSONB NOT NULL, -- Cart items snapshot
    cart_value DECIMAL(10,2),
    item_count INTEGER,
    reminder_sent_count INTEGER DEFAULT 0,
    last_reminder_at TIMESTAMP WITH TIME ZONE,
    recovered BOOLEAN DEFAULT false,
    recovered_at TIMESTAMP WITH TIME ZONE,
    recovered_order_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- =============================================
-- 6. USER SEGMENTS - Target groups for campaigns
-- =============================================
CREATE TABLE IF NOT EXISTS user_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    segment_type VARCHAR(50) NOT NULL CHECK (segment_type IN (
        'all', 'user_type', 'purchase_history', 'activity', 
        'location', 'order_value', 'custom'
    )),
    filter_criteria JSONB NOT NULL, -- Dynamic filter rules
    user_count INTEGER DEFAULT 0,
    is_dynamic BOOLEAN DEFAULT true, -- Auto-update user count
    last_calculated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);
-- =============================================
-- 7. EMAIL SUBSCRIPTIONS - Manage opt-in/opt-out
-- =============================================
CREATE TABLE IF NOT EXISTS email_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    email_address VARCHAR(255) NOT NULL,
    subscription_type VARCHAR(50) NOT NULL CHECK (subscription_type IN (
        'all', 'promotional', 'newsletter', 'order_updates', 'product_alerts'
    )),
    is_subscribed BOOLEAN DEFAULT true,
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    unsubscribed_at TIMESTAMP WITH TIME ZONE,
    unsubscribe_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(email_address, subscription_type)
);
-- =============================================
-- 8. EMAIL SETTINGS - Global configuration
-- =============================================
CREATE TABLE IF NOT EXISTS email_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(50) DEFAULT 'string',
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Insert default settings
INSERT INTO email_settings (setting_key, setting_value, setting_type, description) VALUES
('provider', 'resend', 'string', 'Email service provider'),
('api_key', '', 'secret', 'API key for email provider'),
('from_email', 'noreply@9rx.com', 'string', 'Default sender email'),
('from_name', '9RX Pharmacy Supplies', 'string', 'Default sender name'),
('reply_to', 'info@9rx.com', 'string', 'Reply-to email address'),
('abandoned_cart_delay_hours', '24', 'number', 'Hours before sending abandoned cart email'),
('abandoned_cart_max_reminders', '3', 'number', 'Maximum cart reminders per user'),
('inactive_user_days', '30', 'number', 'Days of inactivity before reminder'),
('daily_send_limit', '1000', 'number', 'Maximum emails per day'),
('batch_size', '100', 'number', 'Emails per batch for bulk sending')
ON CONFLICT (setting_key) DO NOTHING;
-- =============================================
-- INDEXES for better performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_email_templates_type ON email_templates(template_type, is_active);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_email_automations_trigger ON email_automations(trigger_type, is_active);
CREATE INDEX IF NOT EXISTS idx_email_logs_user ON email_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_campaign ON email_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status, sent_at);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_user ON abandoned_carts(user_id, recovered);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_reminder ON abandoned_carts(reminder_sent_count, last_reminder_at);
CREATE INDEX IF NOT EXISTS idx_user_segments_type ON user_segments(segment_type);
CREATE INDEX IF NOT EXISTS idx_email_subscriptions_email ON email_subscriptions(email_address, is_subscribed);
-- =============================================
-- RLS Policies
-- =============================================
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE abandoned_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_settings ENABLE ROW LEVEL SECURITY;
-- Admin only policies
CREATE POLICY "Admins can manage email_templates" ON email_templates FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can manage email_campaigns" ON email_campaigns FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can manage email_automations" ON email_automations FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can view email_logs" ON email_logs FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can manage abandoned_carts" ON abandoned_carts FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can manage user_segments" ON user_segments FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can manage email_settings" ON email_settings FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
-- Users can manage their own subscriptions
CREATE POLICY "Users can manage own subscriptions" ON email_subscriptions FOR ALL USING (
    user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
-- =============================================
-- Triggers for updated_at
-- =============================================
DROP TRIGGER IF EXISTS update_email_templates_updated_at ON email_templates;
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_email_campaigns_updated_at ON email_campaigns;
CREATE TRIGGER update_email_campaigns_updated_at BEFORE UPDATE ON email_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_email_automations_updated_at ON email_automations;
CREATE TRIGGER update_email_automations_updated_at BEFORE UPDATE ON email_automations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_abandoned_carts_updated_at ON abandoned_carts;
CREATE TRIGGER update_abandoned_carts_updated_at BEFORE UPDATE ON abandoned_carts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_user_segments_updated_at ON user_segments;
CREATE TRIGGER update_user_segments_updated_at BEFORE UPDATE ON user_segments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- =============================================
-- Insert default email templates
-- =============================================
INSERT INTO email_templates (name, subject, template_type, html_content, variables, is_active) VALUES
(
    'Welcome Email',
    'Welcome to 9RX Pharmacy Supplies! 🎉',
    'welcome',
    '<!DOCTYPE html><html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">Welcome to 9RX! 🎉</h1>
    </div>
    <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px;">Hi {{user_name}},</p>
        <p>Thank you for joining 9RX Pharmacy Supplies! We are excited to have you on board.</p>
        <p>As a valued customer, you now have access to:</p>
        <ul>
            <li>Premium pharmacy supplies at competitive prices</li>
            <li>Fast shipping across the nation</li>
            <li>Exclusive deals and offers</li>
            <li>24/7 customer support</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{shop_url}}" style="background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Start Shopping</a>
        </div>
        <p>If you have any questions, feel free to reach out to us!</p>
        <p>Best regards,<br>The 9RX Team</p>
    </div>
    </body></html>',
    ARRAY['user_name', 'shop_url'],
    true
),
(
    'Abandoned Cart Reminder',
    'You left something behind! 🛒',
    'abandoned_cart',
    '<!DOCTYPE html><html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">Don''t Forget Your Cart! 🛒</h1>
    </div>
    <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px;">Hi {{user_name}},</p>
        <p>We noticed you left some items in your cart. Don''t worry, we saved them for you!</p>
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Your Cart ({{item_count}} items)</h3>
            {{cart_items}}
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 15px 0;">
            <p style="font-size: 18px; font-weight: bold; text-align: right;">Total: ${{cart_total}}</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{cart_url}}" style="background: #f59e0b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Complete Your Order</a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">This cart will expire in 48 hours. Order now to avoid losing your items!</p>
    </div>
    </body></html>',
    ARRAY['user_name', 'item_count', 'cart_items', 'cart_total', 'cart_url'],
    true
),
(
    'Order Confirmation',
    'Order Confirmed! #{{order_number}} ✅',
    'order_confirmation',
    '<!DOCTYPE html><html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">Order Confirmed! ✅</h1>
        <p style="color: white; margin: 10px 0 0;">Order #{{order_number}}</p>
    </div>
    <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px;">Hi {{user_name}},</p>
        <p>Thank you for your order! We''re getting it ready for shipment.</p>
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Order Summary</h3>
            {{order_items}}
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 15px 0;">
            <p style="text-align: right;">Subtotal: ${{subtotal}}</p>
            <p style="text-align: right;">Shipping: ${{shipping}}</p>
            <p style="font-size: 18px; font-weight: bold; text-align: right;">Total: ${{order_total}}</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{order_url}}" style="background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Track Order</a>
        </div>
    </div>
    </body></html>',
    ARRAY['user_name', 'order_number', 'order_items', 'subtotal', 'shipping', 'order_total', 'order_url'],
    true
),
(
    'Promotional Email',
    '{{promo_title}} - Limited Time Offer! 🔥',
    'promotional',
    '<!DOCTYPE html><html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">{{promo_title}} 🔥</h1>
        <p style="color: white; font-size: 24px; margin: 10px 0;">{{discount_text}}</p>
    </div>
    <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px;">Hi {{user_name}},</p>
        <p>{{promo_description}}</p>
        {{featured_products}}
        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold;">Use Code: <span style="font-size: 20px; color: #d97706;">{{promo_code}}</span></p>
            <p style="margin: 5px 0 0; color: #92400e; font-size: 14px;">Valid until {{expiry_date}}</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{shop_url}}" style="background: #8b5cf6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Shop Now</a>
        </div>
    </div>
    </body></html>',
    ARRAY['user_name', 'promo_title', 'discount_text', 'promo_description', 'featured_products', 'promo_code', 'expiry_date', 'shop_url'],
    true
),
(
    'Restock Reminder',
    'Time to Restock? Your supplies might be running low 📦',
    'restock_reminder',
    '<!DOCTYPE html><html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">Time to Restock? 📦</h1>
    </div>
    <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px;">Hi {{user_name}},</p>
        <p>Based on your previous orders, we think you might be running low on these items:</p>
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            {{restock_items}}
        </div>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{reorder_url}}" style="background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reorder Now</a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">Need something different? Browse our full catalog for more options.</p>
    </div>
    </body></html>',
    ARRAY['user_name', 'restock_items', 'reorder_url'],
    true
)
ON CONFLICT DO NOTHING;

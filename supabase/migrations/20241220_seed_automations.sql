-- Seed default email automations

-- Welcome Email Automation
INSERT INTO email_automations (name, description, trigger_type, trigger_conditions, is_active, priority, send_limit_per_user, cooldown_days)
VALUES (
  'Welcome Email',
  'Send welcome email immediately after user signup',
  'welcome',
  '{"delay_hours": 0}',
  true,
  100,
  1,
  365
) ON CONFLICT DO NOTHING;
-- Cart Recovery Automation (24 hours)
INSERT INTO email_automations (name, description, trigger_type, trigger_conditions, is_active, priority, send_limit_per_user, cooldown_days)
VALUES (
  'Cart Recovery - 24 Hours',
  'Remind users about abandoned carts after 24 hours',
  'abandoned_cart',
  '{"delay_hours": 24, "min_cart_value": 100}',
  true,
  90,
  1,
  7
) ON CONFLICT DO NOTHING;
-- Order Confirmation Automation
INSERT INTO email_automations (name, description, trigger_type, trigger_conditions, is_active, priority, send_limit_per_user, cooldown_days)
VALUES (
  'Order Confirmation',
  'Send order confirmation immediately after order placement',
  'order_placed',
  '{"delay_hours": 0}',
  true,
  100,
  99,
  0
) ON CONFLICT DO NOTHING;
-- Shipping Notification Automation
INSERT INTO email_automations (name, description, trigger_type, trigger_conditions, is_active, priority, send_limit_per_user, cooldown_days)
VALUES (
  'Shipping Notification',
  'Notify customer when order is shipped',
  'order_shipped',
  '{"delay_hours": 0}',
  true,
  100,
  99,
  0
) ON CONFLICT DO NOTHING;
-- Delivery Confirmation + Feedback Request
INSERT INTO email_automations (name, description, trigger_type, trigger_conditions, is_active, priority, send_limit_per_user, cooldown_days)
VALUES (
  'Delivery + Feedback Request',
  'Request feedback 24 hours after delivery',
  'order_delivered',
  '{"delay_hours": 24}',
  true,
  80,
  1,
  7
) ON CONFLICT DO NOTHING;
-- Win-Back Campaign (30 days inactive)
INSERT INTO email_automations (name, description, trigger_type, trigger_conditions, is_active, priority, send_limit_per_user, cooldown_days)
VALUES (
  'Win-Back Campaign',
  'Re-engage users who have been inactive for 30 days',
  'inactive_user',
  '{"inactive_days": 30}',
  false,
  70,
  1,
  30
) ON CONFLICT DO NOTHING;

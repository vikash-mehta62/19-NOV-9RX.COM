-- Email Cron Helper Functions
-- These functions are used by the server-side cron for various operations

-- ============================================
-- 1. Check if email is suppressed
-- ============================================
CREATE OR REPLACE FUNCTION is_email_suppressed(check_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM email_suppression_list 
    WHERE email = LOWER(check_email)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. Get email system health stats
-- ============================================
CREATE OR REPLACE FUNCTION get_email_system_health()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'queue_pending', (SELECT COUNT(*) FROM email_queue WHERE status = 'pending'),
    'queue_processing', (SELECT COUNT(*) FROM email_queue WHERE status = 'processing'),
    'queue_sent_24h', (SELECT COUNT(*) FROM email_queue WHERE status = 'sent' AND sent_at > NOW() - INTERVAL '24 hours'),
    'queue_failed_24h', (SELECT COUNT(*) FROM email_queue WHERE status = 'failed' AND updated_at > NOW() - INTERVAL '24 hours'),
    'automations_active', (SELECT COUNT(*) FROM email_automations WHERE is_active = true),
    'campaigns_sending', (SELECT COUNT(*) FROM email_campaigns WHERE status = 'sending')
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. Get subscriber status
-- ============================================
CREATE OR REPLACE FUNCTION get_subscriber_status(check_email TEXT)
RETURNS VARCHAR AS $$
DECLARE
  sub_status VARCHAR;
BEGIN
  SELECT status INTO sub_status 
  FROM email_subscribers 
  WHERE email = LOWER(check_email);
  
  RETURN COALESCE(sub_status, 'unknown');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. Ensure carts table has abandoned_email_sent_at column
-- ============================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'carts' AND column_name = 'abandoned_email_sent_at'
  ) THEN
    ALTER TABLE carts ADD COLUMN abandoned_email_sent_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- ============================================
-- 5. Index for abandoned cart queries
-- ============================================
CREATE INDEX IF NOT EXISTS idx_carts_abandoned 
ON carts(status, updated_at, abandoned_email_sent_at) 
WHERE status = 'active' AND abandoned_email_sent_at IS NULL;

-- ============================================
-- 6. Index for automation executions
-- ============================================
CREATE INDEX IF NOT EXISTS idx_automation_exec_status 
ON automation_executions(status, created_at) 
WHERE status = 'pending';

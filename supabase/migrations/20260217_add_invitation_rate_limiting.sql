-- =====================================================
-- INVITATION RATE LIMITING
-- Date: February 17, 2026
-- Description: Prevent invitation spam and abuse
-- =====================================================

-- Function to check invitation rate limits
CREATE OR REPLACE FUNCTION check_invitation_rate_limit(p_group_id UUID)
RETURNS TABLE (
  allowed BOOLEAN,
  reason TEXT,
  invitations_sent_today INTEGER,
  daily_limit INTEGER
) AS $$
DECLARE
  v_invitations_today INTEGER;
  v_daily_limit INTEGER := 50; -- Default limit: 50 invitations per day
  v_hourly_limit INTEGER := 10; -- Hourly limit: 10 invitations
  v_invitations_last_hour INTEGER;
BEGIN
  -- Count invitations sent today
  SELECT COUNT(*) INTO v_invitations_today
  FROM pharmacy_invitations
  WHERE group_id = p_group_id
  AND created_at >= CURRENT_DATE;
  
  -- Count invitations sent in last hour
  SELECT COUNT(*) INTO v_invitations_last_hour
  FROM pharmacy_invitations
  WHERE group_id = p_group_id
  AND created_at >= NOW() - INTERVAL '1 hour';
  
  -- Check hourly limit first
  IF v_invitations_last_hour >= v_hourly_limit THEN
    RETURN QUERY SELECT 
      false,
      'Hourly invitation limit reached. Please try again later.',
      v_invitations_today,
      v_daily_limit;
    RETURN;
  END IF;
  
  -- Check daily limit
  IF v_invitations_today >= v_daily_limit THEN
    RETURN QUERY SELECT 
      false,
      'Daily invitation limit reached. Please try again tomorrow.',
      v_invitations_today,
      v_daily_limit;
    RETURN;
  END IF;
  
  -- All checks passed
  RETURN QUERY SELECT 
    true,
    'Rate limit check passed',
    v_invitations_today,
    v_daily_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_invitation_rate_limit(UUID) IS 
  'Checks if a group has exceeded invitation rate limits';

GRANT EXECUTE ON FUNCTION check_invitation_rate_limit(UUID) TO authenticated;

-- =====================================================
-- TRIGGER TO ENFORCE RATE LIMITING
-- =====================================================

CREATE OR REPLACE FUNCTION enforce_invitation_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_rate_check RECORD;
BEGIN
  -- Check rate limit
  SELECT * INTO v_rate_check
  FROM check_invitation_rate_limit(NEW.group_id)
  LIMIT 1;
  
  -- If rate limit exceeded, prevent insertion
  IF NOT v_rate_check.allowed THEN
    RAISE EXCEPTION 'Rate limit exceeded: %', v_rate_check.reason
      USING HINT = 'Please wait before sending more invitations';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (only for INSERT operations)
DROP TRIGGER IF EXISTS trigger_enforce_invitation_rate_limit ON pharmacy_invitations;

CREATE TRIGGER trigger_enforce_invitation_rate_limit
  BEFORE INSERT ON pharmacy_invitations
  FOR EACH ROW
  EXECUTE FUNCTION enforce_invitation_rate_limit();

COMMENT ON FUNCTION enforce_invitation_rate_limit() IS 
  'Enforces rate limiting on invitation creation';

-- =====================================================
-- FUNCTION TO CHECK FOR DUPLICATE INVITATIONS
-- =====================================================

CREATE OR REPLACE FUNCTION check_duplicate_invitation()
RETURNS TRIGGER AS $$
DECLARE
  v_existing_count INTEGER;
BEGIN
  -- Check for existing pending invitations to same email from same group
  SELECT COUNT(*) INTO v_existing_count
  FROM pharmacy_invitations
  WHERE group_id = NEW.group_id
  AND email = NEW.email
  AND status = 'pending'
  AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);
  
  IF v_existing_count > 0 THEN
    RAISE EXCEPTION 'A pending invitation already exists for this email address'
      USING HINT = 'Cancel the existing invitation before sending a new one';
  END IF;
  
  -- Check if pharmacy already exists in group
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE group_id = NEW.group_id
    AND email = NEW.email
    AND type = 'pharmacy'
  ) THEN
    RAISE EXCEPTION 'A pharmacy with this email is already a member of your group'
      USING HINT = 'This pharmacy is already part of your group';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_check_duplicate_invitation ON pharmacy_invitations;

CREATE TRIGGER trigger_check_duplicate_invitation
  BEFORE INSERT ON pharmacy_invitations
  FOR EACH ROW
  EXECUTE FUNCTION check_duplicate_invitation();

COMMENT ON FUNCTION check_duplicate_invitation() IS 
  'Prevents duplicate invitations to the same email';

-- =====================================================
-- SCHEDULED CLEANUP FUNCTION FOR EXPIRED INVITATIONS
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS TABLE (
  expired_count INTEGER,
  cleaned_at TIMESTAMPTZ
) AS $$
DECLARE
  v_expired_count INTEGER;
BEGIN
  -- Update expired invitations
  WITH updated AS (
    UPDATE pharmacy_invitations
    SET status = 'expired'
    WHERE status = 'pending'
    AND expires_at < NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO v_expired_count FROM updated;
  
  -- Return results
  RETURN QUERY SELECT v_expired_count, NOW();
  
  -- Log the cleanup
  RAISE NOTICE 'Cleaned up % expired invitations', v_expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_expired_invitations() IS 
  'Marks expired pending invitations as expired. Should be run periodically via cron job.';

GRANT EXECUTE ON FUNCTION cleanup_expired_invitations() TO authenticated;

-- =====================================================
-- VIEW FOR RATE LIMIT MONITORING
-- =====================================================

CREATE OR REPLACE VIEW invitation_rate_limits AS
SELECT 
  pi.group_id,
  p.display_name as group_name,
  COUNT(*) FILTER (WHERE pi.created_at >= CURRENT_DATE) as invitations_today,
  COUNT(*) FILTER (WHERE pi.created_at >= NOW() - INTERVAL '1 hour') as invitations_last_hour,
  50 as daily_limit,
  10 as hourly_limit,
  CASE 
    WHEN COUNT(*) FILTER (WHERE pi.created_at >= NOW() - INTERVAL '1 hour') >= 10 THEN 'BLOCKED_HOURLY'
    WHEN COUNT(*) FILTER (WHERE pi.created_at >= CURRENT_DATE) >= 50 THEN 'BLOCKED_DAILY'
    WHEN COUNT(*) FILTER (WHERE pi.created_at >= CURRENT_DATE) >= 40 THEN 'WARNING'
    ELSE 'OK'
  END as status
FROM pharmacy_invitations pi
JOIN profiles p ON p.id = pi.group_id
WHERE p.type = 'group'
GROUP BY pi.group_id, p.display_name;

COMMENT ON VIEW invitation_rate_limits IS 
  'Monitor invitation rate limits by group';

GRANT SELECT ON invitation_rate_limits TO authenticated;

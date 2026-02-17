-- =====================================================
-- INVITATION AUDIT TRAIL
-- Date: February 17, 2026
-- Description: Track all invitation lifecycle events for debugging and compliance
-- =====================================================

-- Create audit log table for invitation actions
CREATE TABLE IF NOT EXISTS pharmacy_invitation_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID NOT NULL REFERENCES pharmacy_invitations(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created', 'sent', 'viewed', 'accepted', 'cancelled', 'expired', 'resent')),
  old_status TEXT,
  new_status TEXT,
  performed_by UUID REFERENCES profiles(id),
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invitation_audit_invitation_id ON pharmacy_invitation_audit(invitation_id);
CREATE INDEX IF NOT EXISTS idx_invitation_audit_performed_at ON pharmacy_invitation_audit(performed_at);
CREATE INDEX IF NOT EXISTS idx_invitation_audit_action ON pharmacy_invitation_audit(action);
CREATE INDEX IF NOT EXISTS idx_invitation_audit_performed_by ON pharmacy_invitation_audit(performed_by);

COMMENT ON TABLE pharmacy_invitation_audit IS 'Audit trail for all pharmacy invitation actions';
COMMENT ON COLUMN pharmacy_invitation_audit.action IS 'Type of action performed on the invitation';
COMMENT ON COLUMN pharmacy_invitation_audit.metadata IS 'Additional context data in JSON format';

-- Enable RLS
ALTER TABLE pharmacy_invitation_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Groups can view audit logs for their invitations" ON pharmacy_invitation_audit
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pharmacy_invitations pi
      WHERE pi.id = invitation_id 
      AND pi.group_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "System can insert audit logs" ON pharmacy_invitation_audit
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- TRIGGER FUNCTION TO AUTO-LOG INVITATION CHANGES
-- =====================================================

CREATE OR REPLACE FUNCTION log_invitation_change()
RETURNS TRIGGER AS $$
DECLARE
  v_action TEXT;
  v_old_status TEXT;
  v_new_status TEXT;
BEGIN
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    v_new_status := NEW.status;
    v_old_status := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old_status := OLD.status;
    v_new_status := NEW.status;
    
    -- Determine specific action based on status change
    IF OLD.status != NEW.status THEN
      CASE NEW.status
        WHEN 'accepted' THEN v_action := 'accepted';
        WHEN 'cancelled' THEN v_action := 'cancelled';
        WHEN 'expired' THEN v_action := 'expired';
        ELSE v_action := 'updated';
      END CASE;
    ELSE
      v_action := 'updated';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'deleted';
    v_old_status := OLD.status;
    v_new_status := NULL;
  END IF;

  -- Insert audit record
  INSERT INTO pharmacy_invitation_audit (
    invitation_id,
    action,
    old_status,
    new_status,
    performed_by,
    notes,
    metadata
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    v_action,
    v_old_status,
    v_new_status,
    auth.uid(),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'Invitation created'
      WHEN TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN 'Status changed from ' || OLD.status || ' to ' || NEW.status
      WHEN TG_OP = 'DELETE' THEN 'Invitation deleted'
      ELSE 'Invitation updated'
    END,
    jsonb_build_object(
      'operation', TG_OP,
      'table', TG_TABLE_NAME,
      'email', COALESCE(NEW.email, OLD.email),
      'group_id', COALESCE(NEW.group_id, OLD.group_id)
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_log_invitation_change ON pharmacy_invitations;

CREATE TRIGGER trigger_log_invitation_change
  AFTER INSERT OR UPDATE OR DELETE ON pharmacy_invitations
  FOR EACH ROW
  EXECUTE FUNCTION log_invitation_change();

COMMENT ON FUNCTION log_invitation_change() IS 
  'Automatically logs all changes to pharmacy invitations for audit trail';

-- =====================================================
-- HELPER FUNCTION TO GET INVITATION HISTORY
-- =====================================================

CREATE OR REPLACE FUNCTION get_invitation_history(p_invitation_id UUID)
RETURNS TABLE (
  action TEXT,
  old_status TEXT,
  new_status TEXT,
  performed_by_name TEXT,
  performed_at TIMESTAMPTZ,
  notes TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pia.action,
    pia.old_status,
    pia.new_status,
    COALESCE(p.display_name, p.first_name || ' ' || p.last_name, 'System') as performed_by_name,
    pia.performed_at,
    pia.notes
  FROM pharmacy_invitation_audit pia
  LEFT JOIN profiles p ON p.id = pia.performed_by
  WHERE pia.invitation_id = p_invitation_id
  ORDER BY pia.performed_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_invitation_history(UUID) IS 
  'Returns the complete audit history for a specific invitation';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_invitation_history(UUID) TO authenticated;

-- =====================================================
-- VIEW FOR INVITATION ANALYTICS
-- =====================================================

CREATE OR REPLACE VIEW invitation_analytics AS
SELECT 
  pi.group_id,
  COUNT(*) as total_invitations,
  COUNT(*) FILTER (WHERE pi.status = 'pending') as pending_invitations,
  COUNT(*) FILTER (WHERE pi.status = 'accepted') as accepted_invitations,
  COUNT(*) FILTER (WHERE pi.status = 'expired') as expired_invitations,
  COUNT(*) FILTER (WHERE pi.status = 'cancelled') as cancelled_invitations,
  ROUND(
    COUNT(*) FILTER (WHERE pi.status = 'accepted')::NUMERIC / 
    NULLIF(COUNT(*), 0) * 100, 
    2
  ) as acceptance_rate,
  AVG(
    EXTRACT(EPOCH FROM (pi.accepted_at - pi.created_at)) / 86400
  ) FILTER (WHERE pi.accepted_at IS NOT NULL) as avg_days_to_accept,
  COUNT(DISTINCT pia.id) FILTER (WHERE pia.action = 'resent') as total_resends
FROM pharmacy_invitations pi
LEFT JOIN pharmacy_invitation_audit pia ON pia.invitation_id = pi.id
GROUP BY pi.group_id;

COMMENT ON VIEW invitation_analytics IS 
  'Analytics summary for pharmacy invitations by group';

-- Grant select on view
GRANT SELECT ON invitation_analytics TO authenticated;

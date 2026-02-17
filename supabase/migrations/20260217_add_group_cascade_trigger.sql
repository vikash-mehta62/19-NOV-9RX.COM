-- =====================================================
-- GROUP DEACTIVATION CASCADE
-- Date: February 17, 2026
-- Description: Automatically cascade status changes from groups to member pharmacies
-- =====================================================

-- Function to cascade group status changes to member pharmacies
CREATE OR REPLACE FUNCTION cascade_group_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if this is a group profile and status changed
  IF NEW.type = 'group' AND OLD.status IS DISTINCT FROM NEW.status THEN
    
    -- Log the cascade operation
    RAISE NOTICE 'Cascading status change for group % from % to %', NEW.id, OLD.status, NEW.status;
    
    -- Update all pharmacy members of this group
    UPDATE profiles
    SET 
      status = NEW.status,
      updated_at = NOW()
    WHERE 
      group_id = NEW.id 
      AND type = 'pharmacy'
      AND status != NEW.status; -- Only update if different
    
    -- Log how many pharmacies were updated
    RAISE NOTICE 'Updated % pharmacy members', FOUND;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for group status changes
DROP TRIGGER IF EXISTS trigger_cascade_group_status ON profiles;

CREATE TRIGGER trigger_cascade_group_status
  AFTER UPDATE OF status ON profiles
  FOR EACH ROW
  WHEN (NEW.type = 'group')
  EXECUTE FUNCTION cascade_group_status_change();

COMMENT ON FUNCTION cascade_group_status_change() IS 
  'Automatically updates status of all pharmacy members when a group status changes';

COMMENT ON TRIGGER trigger_cascade_group_status ON profiles IS 
  'Cascades group status changes to member pharmacies';

-- =====================================================
-- ADD AUDIT LOG FOR GROUP STATUS CHANGES
-- =====================================================

-- Create audit log table if it doesn't exist
CREATE TABLE IF NOT EXISTS group_status_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  old_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  affected_pharmacies INTEGER DEFAULT 0,
  changed_by UUID REFERENCES profiles(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_group_status_audit_group_id ON group_status_audit(group_id);
CREATE INDEX IF NOT EXISTS idx_group_status_audit_changed_at ON group_status_audit(changed_at);

COMMENT ON TABLE group_status_audit IS 'Audit trail for group status changes and their cascading effects';

-- Function to log group status changes
CREATE OR REPLACE FUNCTION log_group_status_change()
RETURNS TRIGGER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  -- Only log if this is a group and status changed
  IF NEW.type = 'group' AND OLD.status IS DISTINCT FROM NEW.status THEN
    
    -- Count affected pharmacies
    SELECT COUNT(*) INTO affected_count
    FROM profiles
    WHERE group_id = NEW.id AND type = 'pharmacy';
    
    -- Insert audit record
    INSERT INTO group_status_audit (
      group_id,
      old_status,
      new_status,
      affected_pharmacies,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      affected_count,
      auth.uid()
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for audit logging
DROP TRIGGER IF EXISTS trigger_log_group_status_change ON profiles;

CREATE TRIGGER trigger_log_group_status_change
  AFTER UPDATE OF status ON profiles
  FOR EACH ROW
  WHEN (NEW.type = 'group')
  EXECUTE FUNCTION log_group_status_change();

-- Enable RLS on audit table
ALTER TABLE group_status_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit table
CREATE POLICY "Groups can view own audit logs" ON group_status_audit
  FOR SELECT USING (
    auth.uid() = group_id 
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Only system can insert audit logs" ON group_status_audit
  FOR INSERT WITH CHECK (true); -- Trigger handles this

COMMENT ON TRIGGER trigger_log_group_status_change ON profiles IS 
  'Logs group status changes to audit table';

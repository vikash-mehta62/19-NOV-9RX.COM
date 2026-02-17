-- Fix invitation expires date display issue
-- Issue: accepted_at was null for accepted invitations, causing Dec 31, 1969 display

-- 1. Add 'updated' action to audit table constraint
ALTER TABLE pharmacy_invitation_audit 
DROP CONSTRAINT IF EXISTS pharmacy_invitation_audit_action_check;

ALTER TABLE pharmacy_invitation_audit 
ADD CONSTRAINT pharmacy_invitation_audit_action_check 
CHECK (action = ANY (ARRAY[
  'created'::text, 
  'sent'::text, 
  'viewed'::text, 
  'accepted'::text, 
  'cancelled'::text, 
  'expired'::text, 
  'resent'::text, 
  'updated'::text
]));

-- 2. Set accepted_at timestamp for accepted invitations that don't have it
UPDATE pharmacy_invitations
SET accepted_at = created_at
WHERE status = 'accepted' AND accepted_at IS NULL;

-- 3. Add a trigger to automatically set accepted_at when status changes to accepted
CREATE OR REPLACE FUNCTION set_invitation_accepted_at()
RETURNS TRIGGER AS $$
BEGIN
  -- If status is being changed to 'accepted' and accepted_at is null, set it
  IF NEW.status = 'accepted' AND NEW.accepted_at IS NULL THEN
    NEW.accepted_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_set_invitation_accepted_at ON pharmacy_invitations;

CREATE TRIGGER trigger_set_invitation_accepted_at
  BEFORE UPDATE ON pharmacy_invitations
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'accepted')
  EXECUTE FUNCTION set_invitation_accepted_at();

COMMENT ON FUNCTION set_invitation_accepted_at() IS 
'Automatically sets accepted_at timestamp when invitation status changes to accepted';

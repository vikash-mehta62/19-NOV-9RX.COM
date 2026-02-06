-- =====================================================
-- CREATE TRIGGER: Auto-sync pharmacy_invitations with profiles
-- =====================================================
-- This trigger automatically syncs pharmacy_invitations table
-- whenever a profile status changes (approved/rejected)
-- =====================================================

-- Step 1: Create the trigger function
CREATE OR REPLACE FUNCTION sync_pharmacy_invitation_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process if this is a pharmacy profile
    IF NEW.type = 'pharmacy' THEN
        
        -- Case 1: Profile was approved (pending -> active)
        IF OLD.status = 'pending' AND NEW.status = 'active' THEN
            -- Update invitation to "accepted"
            UPDATE pharmacy_invitations
            SET 
                status = 'accepted',
                accepted_by = COALESCE(accepted_by, NEW.id)
            WHERE email = NEW.email
              AND status = 'pending';
            
            RAISE NOTICE 'Auto-synced invitation to accepted for: %', NEW.email;
        END IF;
        
        -- Case 2: Profile was rejected (pending -> rejected)
        IF OLD.status = 'pending' AND NEW.status = 'rejected' THEN
            -- Update invitation to "cancelled"
            UPDATE pharmacy_invitations
            SET status = 'cancelled'
            WHERE email = NEW.email
              AND status = 'pending';
            
            RAISE NOTICE 'Auto-synced invitation to cancelled for: %', NEW.email;
        END IF;
        
        -- Case 3: Ensure group_id is set if missing
        IF NEW.group_id IS NULL THEN
            -- Try to get group_id from invitation
            SELECT group_id INTO NEW.group_id
            FROM pharmacy_invitations
            WHERE email = NEW.email
              AND group_id IS NOT NULL
            LIMIT 1;
            
            IF NEW.group_id IS NOT NULL THEN
                RAISE NOTICE 'Auto-set group_id for: %', NEW.email;
            END IF;
        END IF;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create the trigger
DROP TRIGGER IF EXISTS auto_sync_pharmacy_invitation ON profiles;

CREATE TRIGGER auto_sync_pharmacy_invitation
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.group_id IS DISTINCT FROM NEW.group_id)
    EXECUTE FUNCTION sync_pharmacy_invitation_status();

-- Step 3: Verify trigger was created
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'auto_sync_pharmacy_invitation';

-- Step 4: Test the trigger with a sample update
-- (This is just a test - comment out if not needed)
/*
-- Test Case 1: Approve a pending pharmacy
UPDATE profiles
SET status = 'active', account_status = 'approved'
WHERE email = 'test@pharmacy.com'
  AND status = 'pending'
  AND type = 'pharmacy';

-- Check if invitation was auto-synced
SELECT 
    p.email,
    p.status as profile_status,
    pi.status as invitation_status,
    CASE 
        WHEN pi.status = 'accepted' THEN '✅ AUTO-SYNCED'
        ELSE '❌ NOT SYNCED'
    END as result
FROM profiles p
LEFT JOIN pharmacy_invitations pi ON pi.email = p.email
WHERE p.email = 'test@pharmacy.com';
*/

-- =====================================================
-- HOW IT WORKS:
-- =====================================================
-- 1. Trigger fires BEFORE profile UPDATE
-- 2. Checks if status changed (pending -> active/rejected)
-- 3. Automatically updates pharmacy_invitations table
-- 4. Also sets group_id if missing
-- 
-- Benefits:
-- - No need for manual sync
-- - Works automatically for all future approvals
-- - Handles both approval and rejection
-- - Ensures data consistency
-- =====================================================

-- =====================================================
-- ROLLBACK (if needed):
-- =====================================================
-- DROP TRIGGER IF EXISTS auto_sync_pharmacy_invitation ON profiles;
-- DROP FUNCTION IF EXISTS sync_pharmacy_invitation_status();
-- =====================================================

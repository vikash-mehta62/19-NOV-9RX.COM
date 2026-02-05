-- Fix foreign key constraints for email_automations table
-- This allows proper deletion of automations

-- First, drop existing constraints if they exist
DO $$ 
BEGIN
    -- Drop constraint on email_queue if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'email_queue_automation_id_fkey' 
        AND table_name = 'email_queue'
    ) THEN
        ALTER TABLE email_queue DROP CONSTRAINT email_queue_automation_id_fkey;
    END IF;

    -- Drop constraint on automation_executions if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'automation_executions_automation_id_fkey' 
        AND table_name = 'automation_executions'
    ) THEN
        ALTER TABLE automation_executions DROP CONSTRAINT automation_executions_automation_id_fkey;
    END IF;

    -- Drop constraint on email_tracking if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'email_tracking_automation_id_fkey' 
        AND table_name = 'email_tracking'
    ) THEN
        ALTER TABLE email_tracking DROP CONSTRAINT email_tracking_automation_id_fkey;
    END IF;

    -- Drop constraint on email_logs if it exists (old table name)
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'email_logs_automation_id_fkey' 
        AND table_name = 'email_logs'
    ) THEN
        ALTER TABLE email_logs DROP CONSTRAINT email_logs_automation_id_fkey;
    END IF;
END $$;

-- Re-add constraints with proper ON DELETE behavior
ALTER TABLE email_queue 
ADD CONSTRAINT email_queue_automation_id_fkey 
FOREIGN KEY (automation_id) 
REFERENCES email_automations(id) 
ON DELETE SET NULL;

ALTER TABLE automation_executions 
ADD CONSTRAINT automation_executions_automation_id_fkey 
FOREIGN KEY (automation_id) 
REFERENCES email_automations(id) 
ON DELETE CASCADE;

-- Add constraint for email_tracking if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_tracking') THEN
        ALTER TABLE email_tracking 
        ADD CONSTRAINT email_tracking_automation_id_fkey 
        FOREIGN KEY (automation_id) 
        REFERENCES email_automations(id) 
        ON DELETE SET NULL;
    END IF;
END $$;

-- Add constraint for email_logs if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_logs') THEN
        ALTER TABLE email_logs 
        ADD CONSTRAINT email_logs_automation_id_fkey 
        FOREIGN KEY (automation_id) 
        REFERENCES email_automations(id) 
        ON DELETE SET NULL;
    END IF;
END $$;

-- Verify the constraints
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    rc.delete_rule
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.referential_constraints rc 
    ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name IN ('email_queue', 'automation_executions', 'email_tracking', 'email_logs')
    AND tc.constraint_type = 'FOREIGN KEY'
    AND tc.constraint_name LIKE '%automation_id%'
ORDER BY tc.table_name;

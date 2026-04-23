-- Step 1: Check all existing foreign key constraints on email_automations
SELECT 
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    rc.delete_rule,
    rc.update_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.referential_constraints rc 
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'automation_id'
ORDER BY tc.table_name;

-- Step 2: Drop ALL foreign key constraints that reference automation_id
DO $$ 
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN 
        SELECT 
            tc.table_name,
            tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
            AND kcu.column_name = 'automation_id'
    LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', 
            constraint_record.table_name, 
            constraint_record.constraint_name);
        RAISE NOTICE 'Dropped constraint % from table %', 
            constraint_record.constraint_name, 
            constraint_record.table_name;
    END LOOP;
END $$;

-- Step 3: Re-create constraints with proper ON DELETE behavior
-- For email_queue: SET NULL (preserve queue entries)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'email_queue' AND column_name = 'automation_id'
    ) THEN
        ALTER TABLE email_queue 
        ADD CONSTRAINT email_queue_automation_id_fkey 
        FOREIGN KEY (automation_id) 
        REFERENCES email_automations(id) 
        ON DELETE SET NULL;
        RAISE NOTICE 'Added constraint to email_queue with ON DELETE SET NULL';
    END IF;
END $$;

-- For automation_executions: CASCADE (delete execution history)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'automation_executions' AND column_name = 'automation_id'
    ) THEN
        ALTER TABLE automation_executions 
        ADD CONSTRAINT automation_executions_automation_id_fkey 
        FOREIGN KEY (automation_id) 
        REFERENCES email_automations(id) 
        ON DELETE CASCADE;
        RAISE NOTICE 'Added constraint to automation_executions with ON DELETE CASCADE';
    END IF;
END $$;

-- For email_tracking: SET NULL (preserve tracking data)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'email_tracking' AND column_name = 'automation_id'
    ) THEN
        ALTER TABLE email_tracking 
        ADD CONSTRAINT email_tracking_automation_id_fkey 
        FOREIGN KEY (automation_id) 
        REFERENCES email_automations(id) 
        ON DELETE SET NULL;
        RAISE NOTICE 'Added constraint to email_tracking with ON DELETE SET NULL';
    END IF;
END $$;

-- For email_logs: SET NULL (preserve logs)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'email_logs' AND column_name = 'automation_id'
    ) THEN
        ALTER TABLE email_logs 
        ADD CONSTRAINT email_logs_automation_id_fkey 
        FOREIGN KEY (automation_id) 
        REFERENCES email_automations(id) 
        ON DELETE SET NULL;
        RAISE NOTICE 'Added constraint to email_logs with ON DELETE SET NULL';
    END IF;
END $$;

-- Step 4: Verify all constraints are now correct
SELECT 
    '✅ VERIFICATION RESULTS' as status,
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    COALESCE(rc.delete_rule, 'NO ACTION') as delete_rule,
    CASE 
        WHEN rc.delete_rule = 'CASCADE' AND tc.table_name = 'automation_executions' THEN '✅ Correct'
        WHEN rc.delete_rule = 'SET NULL' AND tc.table_name != 'automation_executions' THEN '✅ Correct'
        ELSE '❌ Needs Fix'
    END as status_check
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.referential_constraints rc 
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'automation_id'
ORDER BY tc.table_name;

-- Migration: Fix all foreign key constraints for proper deletion
-- Date: 2026-02-06
-- Purpose: Allow proper deletion of email_automations, email_templates, email_campaigns
--          by fixing foreign key constraints with appropriate ON DELETE behavior

-- ============================================
-- 1. FIX EMAIL_AUTOMATIONS FOREIGN KEYS
-- ============================================

-- Drop existing constraints on automation_id
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

-- Re-create automation_id constraints with proper ON DELETE behavior
-- email_queue: SET NULL (preserve queue entries)
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

-- automation_executions: CASCADE (delete execution history)
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

-- email_tracking: SET NULL (preserve tracking data)
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

-- email_logs: SET NULL (preserve logs)
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

-- ============================================
-- 2. FIX EMAIL_TEMPLATES FOREIGN KEYS
-- ============================================

-- Drop existing constraints on template_id
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
            AND kcu.column_name = 'template_id'
    LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', 
            constraint_record.table_name, 
            constraint_record.constraint_name);
        RAISE NOTICE 'Dropped constraint % from table %', 
            constraint_record.constraint_name, 
            constraint_record.table_name;
    END LOOP;
END $$;

-- Re-create template_id constraints with proper ON DELETE behavior
-- email_queue: SET NULL
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'email_queue' AND column_name = 'template_id'
    ) THEN
        ALTER TABLE email_queue 
        ADD CONSTRAINT email_queue_template_id_fkey 
        FOREIGN KEY (template_id) 
        REFERENCES email_templates(id) 
        ON DELETE SET NULL;
        RAISE NOTICE 'Added constraint to email_queue with ON DELETE SET NULL';
    END IF;
END $$;

-- email_campaigns: SET NULL
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'email_campaigns' AND column_name = 'template_id'
    ) THEN
        ALTER TABLE email_campaigns 
        ADD CONSTRAINT email_campaigns_template_id_fkey 
        FOREIGN KEY (template_id) 
        REFERENCES email_templates(id) 
        ON DELETE SET NULL;
        RAISE NOTICE 'Added constraint to email_campaigns with ON DELETE SET NULL';
    END IF;
END $$;

-- email_automations: SET NULL
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'email_automations' AND column_name = 'template_id'
    ) THEN
        ALTER TABLE email_automations 
        ADD CONSTRAINT email_automations_template_id_fkey 
        FOREIGN KEY (template_id) 
        REFERENCES email_templates(id) 
        ON DELETE SET NULL;
        RAISE NOTICE 'Added constraint to email_automations with ON DELETE SET NULL';
    END IF;
END $$;

-- email_tracking: SET NULL
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'email_tracking' AND column_name = 'template_id'
    ) THEN
        ALTER TABLE email_tracking 
        ADD CONSTRAINT email_tracking_template_id_fkey 
        FOREIGN KEY (template_id) 
        REFERENCES email_templates(id) 
        ON DELETE SET NULL;
        RAISE NOTICE 'Added constraint to email_tracking with ON DELETE SET NULL';
    END IF;
END $$;

-- email_logs: SET NULL
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'email_logs' AND column_name = 'template_id'
    ) THEN
        ALTER TABLE email_logs 
        ADD CONSTRAINT email_logs_template_id_fkey 
        FOREIGN KEY (template_id) 
        REFERENCES email_templates(id) 
        ON DELETE SET NULL;
        RAISE NOTICE 'Added constraint to email_logs with ON DELETE SET NULL';
    END IF;
END $$;

-- ============================================
-- 3. FIX EMAIL_CAMPAIGNS FOREIGN KEYS
-- ============================================

-- Drop existing constraints on campaign_id
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
            AND kcu.column_name = 'campaign_id'
    LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', 
            constraint_record.table_name, 
            constraint_record.constraint_name);
        RAISE NOTICE 'Dropped constraint % from table %', 
            constraint_record.constraint_name, 
            constraint_record.table_name;
    END LOOP;
END $$;

-- Re-create campaign_id constraints with proper ON DELETE behavior
-- email_queue: SET NULL
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'email_queue' AND column_name = 'campaign_id'
    ) THEN
        ALTER TABLE email_queue 
        ADD CONSTRAINT email_queue_campaign_id_fkey 
        FOREIGN KEY (campaign_id) 
        REFERENCES email_campaigns(id) 
        ON DELETE SET NULL;
        RAISE NOTICE 'Added constraint to email_queue with ON DELETE SET NULL';
    END IF;
END $$;

-- email_tracking: SET NULL
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'email_tracking' AND column_name = 'campaign_id'
    ) THEN
        ALTER TABLE email_tracking 
        ADD CONSTRAINT email_tracking_campaign_id_fkey 
        FOREIGN KEY (campaign_id) 
        REFERENCES email_campaigns(id) 
        ON DELETE SET NULL;
        RAISE NOTICE 'Added constraint to email_tracking with ON DELETE SET NULL';
    END IF;
END $$;

-- email_logs: SET NULL
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'email_logs' AND column_name = 'campaign_id'
    ) THEN
        ALTER TABLE email_logs 
        ADD CONSTRAINT email_logs_campaign_id_fkey 
        FOREIGN KEY (campaign_id) 
        REFERENCES email_campaigns(id) 
        ON DELETE SET NULL;
        RAISE NOTICE 'Added constraint to email_logs with ON DELETE SET NULL';
    END IF;
END $$;

-- ============================================
-- 4. VERIFICATION
-- ============================================

-- Show all foreign key constraints with their delete rules
SELECT 
    '✅ VERIFICATION RESULTS' as info,
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    COALESCE(rc.delete_rule, 'NO ACTION') as delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
    ON tc.constraint_name = ccu.constraint_name
LEFT JOIN information_schema.referential_constraints rc 
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND (
        kcu.column_name IN ('automation_id', 'template_id', 'campaign_id')
        OR ccu.table_name IN ('email_automations', 'email_templates', 'email_campaigns')
    )
ORDER BY ccu.table_name, tc.table_name, kcu.column_name;

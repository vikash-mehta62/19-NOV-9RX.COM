-- =====================================================
-- FIX: Foreign Key Constraint on email_logs table
-- Error: "update or delete on table "email_campaigns" violates 
--        foreign key constraint "email_logs_campaign_id_fkey""
-- =====================================================

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE email_logs 
DROP CONSTRAINT IF EXISTS email_logs_campaign_id_fkey;

-- Step 2: Re-add the foreign key with ON DELETE CASCADE
-- This will automatically delete related email_logs when a campaign is deleted
ALTER TABLE email_logs 
ADD CONSTRAINT email_logs_campaign_id_fkey 
FOREIGN KEY (campaign_id) 
REFERENCES email_campaigns(id) 
ON DELETE CASCADE;

-- =====================================================
-- ALTERNATIVE: If you want to keep the logs but just 
-- set campaign_id to NULL when campaign is deleted,
-- use this instead (comment out above and uncomment below):
-- =====================================================

-- First, make sure campaign_id column allows NULL
-- ALTER TABLE email_logs ALTER COLUMN campaign_id DROP NOT NULL;

-- Then add constraint with SET NULL
-- ALTER TABLE email_logs 
-- ADD CONSTRAINT email_logs_campaign_id_fkey 
-- FOREIGN KEY (campaign_id) 
-- REFERENCES email_campaigns(id) 
-- ON DELETE SET NULL;

-- =====================================================
-- Verify the constraint was updated
-- =====================================================
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule,
    rc.update_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
    AND tc.table_schema = rc.constraint_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'email_logs'
    AND kcu.column_name = 'campaign_id';

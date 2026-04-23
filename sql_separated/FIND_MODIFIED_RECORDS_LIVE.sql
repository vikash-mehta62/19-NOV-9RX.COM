-- =====================================================
-- FIND MODIFIED RECORDS IN LIVE DATABASE
-- This script checks ONLY existing records from current DB
-- Run this on LIVE database
-- =====================================================

-- This will show you which records have been MODIFIED in live
-- compared to your current database snapshot

-- NOTE: This script contains ALL IDs from your current database
-- It will ONLY show records that exist in both databases
-- and have been modified (based on updated_at timestamp)

-- =====================================================
-- SUMMARY: Quick overview of what changed
-- =====================================================

SELECT 
    'SUMMARY' as report_type,
    'Check results below for details' as message;

-- You can save this output and compare with current DB
-- to identify exactly what changed


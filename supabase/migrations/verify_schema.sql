-- =====================================================
-- SCHEMA VERIFICATION SCRIPT
-- Run this after applying the complete schema migration
-- =====================================================

-- Set output format
\pset border 2
\pset format wrapped

\echo '====================================================='
\echo 'SCHEMA VERIFICATION REPORT'
\echo '====================================================='
\echo ''

-- 1. Count Tables
\echo '1. TABLE COUNT'
\echo '-----------------------------------------------------'
SELECT 
    COUNT(*) as total_tables,
    COUNT(*) FILTER (WHERE table_type = 'BASE TABLE') as base_tables,
    COUNT(*) FILTER (WHERE table_type = 'VIEW') as views
FROM information_schema.tables 
WHERE table_schema = 'public';
\echo ''

-- 2. List All Tables
\echo '2. ALL TABLES'
\echo '-----------------------------------------------------'
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_type, table_name;
\echo ''

-- 3. Count Indexes
\echo '3. INDEX COUNT'
\echo '-----------------------------------------------------'
SELECT COUNT(*) as total_indexes
FROM pg_indexes 
WHERE schemaname = 'public';
\echo ''

-- 4. Critical Indexes Check
\echo '4. CRITICAL INDEXES VERIFICATION'
\echo '-----------------------------------------------------'
SELECT 
    tablename,
    COUNT(*) as index_count
FROM pg_indexes 
WHERE schemaname = 'public'
GROUP BY tablename
HAVING COUNT(*) > 0
ORDER BY index_count DESC, tablename;
\echo ''

-- 5. Count Functions
\echo '5. FUNCTION COUNT'
\echo '-----------------------------------------------------'
SELECT COUNT(*) as total_functions
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION';
\echo ''

-- 6. List All Functions
\echo '6. ALL FUNCTIONS'
\echo '-----------------------------------------------------'
SELECT 
    routine_name,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION'
ORDER BY routine_name;
\echo ''

-- 7. Count Triggers
\echo '7. TRIGGER COUNT'
\echo '-----------------------------------------------------'
SELECT COUNT(*) as total_triggers
FROM information_schema.triggers 
WHERE trigger_schema = 'public';
\echo ''

-- 8. List All Triggers
\echo '8. ALL TRIGGERS'
\echo '-----------------------------------------------------'
SELECT 
    trigger_name,
    event_object_table as table_name,
    action_timing,
    event_manipulation as event
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
\echo ''

-- 9. Count RLS Policies
\echo '9. RLS POLICY COUNT'
\echo '-----------------------------------------------------'
SELECT COUNT(*) as total_policies
FROM pg_policies 
WHERE schemaname = 'public';
\echo ''

-- 10. RLS Policies by Table
\echo '10. RLS POLICIES BY TABLE'
\echo '-----------------------------------------------------'
SELECT 
    tablename,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY policy_count DESC, tablename;
\echo ''

-- 11. Tables with RLS Enabled
\echo '11. TABLES WITH RLS ENABLED'
\echo '-----------------------------------------------------'
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
AND rowsecurity = true
ORDER BY tablename;
\echo ''

-- 12. Foreign Key Constraints
\echo '12. FOREIGN KEY CONSTRAINTS'
\echo '-----------------------------------------------------'
SELECT 
    tc.table_name,
    COUNT(*) as fk_count
FROM information_schema.table_constraints tc
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
GROUP BY tc.table_name
ORDER BY fk_count DESC, tc.table_name;
\echo ''

-- 13. Check Critical Tables Exist
\echo '13. CRITICAL TABLES VERIFICATION'
\echo '-----------------------------------------------------'
SELECT 
    table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_name = critical.table_name AND t.table_schema = 'public') 
        THEN '✓ EXISTS' 
        ELSE '✗ MISSING' 
    END as status
FROM (VALUES 
    ('profiles'),
    ('products'),
    ('product_sizes'),
    ('orders'),
    ('order_items'),
    ('invoices'),
    ('banners'),
    ('offers'),
    ('email_templates'),
    ('email_campaigns'),
    ('credit_applications'),
    ('user_credit_lines'),
    ('saved_payment_methods'),
    ('payment_transactions'),
    ('referrals'),
    ('product_reviews'),
    ('carts'),
    ('notifications')
) AS critical(table_name)
ORDER BY table_name;
\echo ''

-- 14. Check Critical Functions Exist
\echo '14. CRITICAL FUNCTIONS VERIFICATION'
\echo '-----------------------------------------------------'
SELECT 
    function_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.routines r WHERE r.routine_name = critical.function_name AND r.routine_schema = 'public') 
        THEN '✓ EXISTS' 
        ELSE '✗ MISSING' 
    END as status
FROM (VALUES 
    ('update_updated_at_column'),
    ('generate_referral_code'),
    ('ensure_referral_code'),
    ('calculate_order_commission'),
    ('log_order_creation'),
    ('log_order_update'),
    ('apply_credit_memo'),
    ('issue_credit_memo'),
    ('record_banner_impression')
) AS critical(function_name)
ORDER BY function_name;
\echo ''

-- 15. Storage Buckets
\echo '15. STORAGE BUCKETS'
\echo '-----------------------------------------------------'
SELECT 
    id,
    name,
    public,
    created_at
FROM storage.buckets
ORDER BY name;
\echo ''

-- 16. Extensions
\echo '16. INSTALLED EXTENSIONS'
\echo '-----------------------------------------------------'
SELECT 
    extname as extension_name,
    extversion as version
FROM pg_extension
WHERE extname IN ('uuid-ossp', 'pgcrypto', 'pg_stat_statements')
ORDER BY extname;
\echo ''

-- 17. Table Sizes
\echo '17. TOP 10 LARGEST TABLES'
\echo '-----------------------------------------------------'
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
\echo ''

-- 18. Summary
\echo '====================================================='
\echo 'VERIFICATION SUMMARY'
\echo '====================================================='
SELECT 
    'Tables' as component,
    COUNT(*)::text as count
FROM information_schema.tables 
WHERE table_schema = 'public'
UNION ALL
SELECT 
    'Indexes',
    COUNT(*)::text
FROM pg_indexes 
WHERE schemaname = 'public'
UNION ALL
SELECT 
    'Functions',
    COUNT(*)::text
FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
UNION ALL
SELECT 
    'Triggers',
    COUNT(*)::text
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
UNION ALL
SELECT 
    'RLS Policies',
    COUNT(*)::text
FROM pg_policies 
WHERE schemaname = 'public'
UNION ALL
SELECT 
    'Foreign Keys',
    COUNT(*)::text
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public';
\echo ''

\echo '====================================================='
\echo 'VERIFICATION COMPLETE'
\echo '====================================================='
\echo 'Review the output above to ensure all components are in place.'
\echo 'If any critical tables or functions are missing, re-run the migration.'
\echo '====================================================='

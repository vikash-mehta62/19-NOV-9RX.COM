-- ============================================================
-- TROUBLESHOOTING QUERIES FOR USER IMPORT
-- ============================================================
-- Jab import me koi problem aaye, ye queries use karo
-- ============================================================


-- ============================================================
-- 1. FIND MISSING TABLES IN DELETE LIST
-- ============================================================
-- Ye query batayega ki kaun se tables profiles ko reference karte hai
-- Jo tables yahan dikhe aur delete list me nahi hai, unhe add karo

SELECT DISTINCT
    tc.table_schema,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND ccu.table_name IN ('profiles', 'users')
AND tc.table_schema = 'public'
ORDER BY tc.table_name;


-- ============================================================
-- 2. COUNT ALL REFERENCES TO PROFILES
-- ============================================================
-- Ye query batayega ki kitne rows profiles ko reference kar rahe hai

DO $$
DECLARE
    r RECORD;
    row_count INTEGER;
BEGIN
    FOR r IN 
        SELECT DISTINCT
            tc.table_name,
            kcu.column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND kcu.referenced_table_name = 'profiles'
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I WHERE %I IS NOT NULL', 
                      r.table_name, r.column_name) INTO row_count;
        
        IF row_count > 0 THEN
            RAISE NOTICE 'Table: %, Column: %, Count: %', 
                        r.table_name, r.column_name, row_count;
        END IF;
    END LOOP;
END $$;


-- ============================================================
-- 3. FIND DUPLICATE EMAILS
-- ============================================================
-- Import se pehle check karo ki duplicate emails toh nahi hai

-- Source database me check karo:
SELECT email, COUNT(*) as count
FROM auth.users
GROUP BY email
HAVING COUNT(*) > 1;

-- Profiles me bhi check karo:
SELECT email, COUNT(*) as count
FROM profiles
GROUP BY email
HAVING COUNT(*) > 1;


-- ============================================================
-- 4. FIND ORPHANED RECORDS
-- ============================================================

-- Profiles without auth.users
SELECT 
    p.id,
    p.email,
    p.role,
    'Profile exists but no auth.users' as issue
FROM profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE u.id IS NULL;

-- Auth.users without profiles
SELECT 
    u.id,
    u.email,
    'Auth.users exists but no profile' as issue
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- Identities without users
SELECT 
    i.id,
    i.user_id,
    i.provider,
    'Identity exists but no user' as issue
FROM auth.identities i
LEFT JOIN auth.users u ON i.user_id = u.id
WHERE u.id IS NULL;


-- ============================================================
-- 5. CHECK SCHEMA DIFFERENCES
-- ============================================================
-- Source aur target database ke columns compare karo

-- auth.users columns
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'auth'
AND table_name = 'users'
ORDER BY ordinal_position;

-- profiles columns
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'profiles'
ORDER BY ordinal_position;


-- ============================================================
-- 6. VERIFY FK CONSTRAINTS ARE DISABLED
-- ============================================================

SHOW session_replication_role;
-- Should return 'replica' when disabled
-- Should return 'origin' when enabled


-- ============================================================
-- 7. CHECK CURRENT DATA COUNTS
-- ============================================================

SELECT 
    'auth.users' as table_name, 
    COUNT(*) as count,
    MIN(created_at) as oldest,
    MAX(created_at) as newest
FROM auth.users
UNION ALL
SELECT 
    'auth.identities', 
    COUNT(*),
    MIN(created_at),
    MAX(created_at)
FROM auth.identities
UNION ALL
SELECT 
    'profiles', 
    COUNT(*),
    MIN(created_at),
    MAX(created_at)
FROM profiles
UNION ALL
SELECT 
    'customers', 
    COUNT(*),
    MIN(created_at),
    MAX(created_at)
FROM customers
UNION ALL
SELECT 
    'locations', 
    COUNT(*),
    MIN(created_at),
    MAX(created_at)
FROM locations
UNION ALL
SELECT 
    'orders', 
    COUNT(*),
    MIN(created_at),
    MAX(created_at)
FROM orders;


-- ============================================================
-- 8. CHECK SETTINGS TABLE
-- ============================================================

SELECT 
    id,
    profile_id,
    is_global,
    created_at,
    updated_at
FROM settings;

-- Should have exactly 1 row with is_global = true


-- ============================================================
-- 9. FIND TABLES WITH DATA (After Reset)
-- ============================================================
-- Reset ke baad ye query run karo to check karo ki koi table
-- me data toh nahi reh gaya

DO $$
DECLARE
    r RECORD;
    row_count INTEGER;
BEGIN
    RAISE NOTICE 'Tables with data:';
    RAISE NOTICE '==================';
    
    FOR r IN 
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name NOT IN ('products', 'categories', 'settings', 
                               'subcategories', 'offers', 'blogs',
                               'email_templates', 'festival_themes',
                               'marketing_sections', 'category_configs')
        ORDER BY table_name
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I', r.table_name) INTO row_count;
        
        IF row_count > 0 THEN
            RAISE NOTICE 'Table: % has % rows', r.table_name, row_count;
        END IF;
    END LOOP;
END $$;


-- ============================================================
-- 10. CHECK AUTH SCHEMA TABLES
-- ============================================================

SELECT 
    'auth.users' as table_name, COUNT(*) FROM auth.users
UNION ALL
SELECT 'auth.identities', COUNT(*) FROM auth.identities
UNION ALL
SELECT 'auth.sessions', COUNT(*) FROM auth.sessions
UNION ALL
SELECT 'auth.refresh_tokens', COUNT(*) FROM auth.refresh_tokens;


-- ============================================================
-- 11. VERIFY IMPORT INTEGRITY
-- ============================================================

-- Check if all users have identities
SELECT 
    COUNT(DISTINCT u.id) as total_users,
    COUNT(DISTINCT i.user_id) as users_with_identity,
    COUNT(DISTINCT u.id) - COUNT(DISTINCT i.user_id) as users_without_identity
FROM auth.users u
LEFT JOIN auth.identities i ON u.id = i.user_id;

-- Check if all users have profiles
SELECT 
    COUNT(DISTINCT u.id) as total_users,
    COUNT(DISTINCT p.id) as users_with_profile,
    COUNT(DISTINCT u.id) - COUNT(DISTINCT p.id) as users_without_profile
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id;


-- ============================================================
-- 12. CHECK ROLE DISTRIBUTION
-- ============================================================

SELECT 
    role,
    type,
    status,
    COUNT(*) as count
FROM profiles
GROUP BY role, type, status
ORDER BY role, type, status;


-- ============================================================
-- 13. FIND ADMIN USERS
-- ============================================================

SELECT 
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.role,
    p.type,
    p.status,
    u.email_confirmed_at,
    u.last_sign_in_at
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.role = 'admin'
ORDER BY p.created_at;


-- ============================================================
-- 14. CHECK REFERRAL CHAIN
-- ============================================================

-- Find profiles with referrals
SELECT 
    p1.id,
    p1.email as user_email,
    p1.referred_by,
    p2.email as referred_by_email
FROM profiles p1
LEFT JOIN profiles p2 ON p1.referred_by = p2.id
WHERE p1.referred_by IS NOT NULL
LIMIT 20;


-- ============================================================
-- 15. EMERGENCY: FORCE DELETE SPECIFIC USER
-- ============================================================
-- Agar koi specific user delete nahi ho raha, ye use karo

-- Replace USER_ID with actual user ID
DO $$
DECLARE
    target_user_id UUID := 'PASTE_USER_ID_HERE';
BEGIN
    -- Disable FK constraints
    SET session_replication_role = 'replica';
    
    -- Delete from all tables
    DELETE FROM order_activities WHERE performed_by = target_user_id;
    DELETE FROM orders WHERE profile_id = target_user_id;
    DELETE FROM customers WHERE profile_id = target_user_id;
    DELETE FROM locations WHERE profile_id = target_user_id;
    DELETE FROM payment_settings WHERE profile_id = target_user_id;
    DELETE FROM inventory_transactions WHERE created_by = target_user_id;
    -- Add more tables as needed
    
    -- Delete profile
    UPDATE profiles SET referred_by = NULL WHERE referred_by = target_user_id;
    DELETE FROM profiles WHERE id = target_user_id;
    
    -- Delete auth
    DELETE FROM auth.refresh_tokens WHERE user_id = target_user_id;
    DELETE FROM auth.sessions WHERE user_id = target_user_id;
    DELETE FROM auth.identities WHERE user_id = target_user_id;
    DELETE FROM auth.users WHERE id = target_user_id;
    
    -- Re-enable FK constraints
    SET session_replication_role = 'origin';
    
    RAISE NOTICE 'User % deleted successfully', target_user_id;
END $$;


-- ============================================================
-- 16. CHECK CSV FILE ENCODING
-- ============================================================
-- Agar CSV import me encoding error aaye

-- Check for non-ASCII characters
SELECT 
    id,
    email,
    first_name,
    last_name,
    LENGTH(first_name) as name_length,
    OCTET_LENGTH(first_name) as name_bytes
FROM profiles
WHERE OCTET_LENGTH(first_name) != LENGTH(first_name)
LIMIT 10;


-- ============================================================
-- 17. COMPARE SOURCE AND TARGET COUNTS
-- ============================================================
-- Import ke baad ye query dono databases me run karo

SELECT 
    'auth.users' as table_name,
    COUNT(*) as count,
    COUNT(DISTINCT email) as unique_emails,
    COUNT(CASE WHEN email_confirmed_at IS NOT NULL THEN 1 END) as verified_emails
FROM auth.users
UNION ALL
SELECT 
    'profiles',
    COUNT(*),
    COUNT(DISTINCT email),
    COUNT(CASE WHEN email_verified = true THEN 1 END)
FROM profiles;


-- ============================================================
-- 18. FIX SEQUENCE VALUES (After Import)
-- ============================================================
-- Agar auto-increment IDs use kar rahe ho, sequences reset karo

-- This is usually not needed for UUID-based tables
-- But if you have serial/bigserial columns:

SELECT setval('table_name_id_seq', (SELECT MAX(id) FROM table_name));


-- ============================================================
-- 19. CHECK STORAGE USAGE
-- ============================================================

SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;


-- ============================================================
-- 20. FINAL HEALTH CHECK
-- ============================================================

SELECT 
    'Total Users' as metric,
    COUNT(*)::text as value
FROM auth.users
UNION ALL
SELECT 
    'Verified Users',
    COUNT(*)::text
FROM auth.users
WHERE email_confirmed_at IS NOT NULL
UNION ALL
SELECT 
    'Total Profiles',
    COUNT(*)::text
FROM profiles
UNION ALL
SELECT 
    'Active Profiles',
    COUNT(*)::text
FROM profiles
WHERE status = 'active'
UNION ALL
SELECT 
    'Admin Users',
    COUNT(*)::text
FROM profiles
WHERE role = 'admin'
UNION ALL
SELECT 
    'Customer Profiles',
    COUNT(*)::text
FROM profiles
WHERE type = 'customer'
UNION ALL
SELECT 
    'Settings Records',
    COUNT(*)::text
FROM settings
UNION ALL
SELECT 
    'Global Settings',
    COUNT(*)::text
FROM settings
WHERE is_global = true;


-- ============================================================
-- NOTES:
-- ============================================================
-- 
-- 1. Ye queries troubleshooting ke liye hai
-- 2. Import se pehle aur baad me run karo
-- 3. Errors ko identify karne me help karegi
-- 4. Source aur target dono databases me run kar sakte ho
-- 
-- ============================================================

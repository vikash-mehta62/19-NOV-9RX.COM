-- =====================================================
-- QUICK CHECK: Is trigger properly set up?
-- =====================================================

-- 1. Check if trigger function exists
SELECT 
    'Trigger Function Status' as check_type,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND p.proname = 'handle_new_user'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- 2. Check if trigger exists on auth.users
SELECT 
    'Trigger on auth.users' as check_type,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE t.tgname = 'on_auth_user_created'
        AND n.nspname = 'auth'
        AND c.relname = 'users'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- 3. Show trigger details if exists
SELECT 
    t.tgname as trigger_name,
    c.relname as table_name,
    n.nspname as schema_name,
    CASE t.tgtype::integer & 1 
        WHEN 1 THEN 'ROW' 
        ELSE 'STATEMENT' 
    END as trigger_level,
    CASE t.tgtype::integer & 66
        WHEN 2 THEN 'BEFORE'
        WHEN 64 THEN 'INSTEAD OF'
        ELSE 'AFTER'
    END as trigger_timing,
    CASE t.tgtype::integer & 28
        WHEN 4 THEN 'INSERT'
        WHEN 8 THEN 'DELETE'
        WHEN 16 THEN 'UPDATE'
        ELSE 'MULTIPLE'
    END as trigger_event,
    p.proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname = 'on_auth_user_created';

-- 4. Check RLS policies on profiles
SELECT 
    'RLS Policies Count' as check_type,
    COUNT(*)::text || ' policies found' as status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles';

-- 5. List all policies
SELECT 
    policyname as policy_name,
    cmd as policy_type,
    CASE 
        WHEN qual IS NOT NULL THEN 'Has USING clause'
        ELSE 'No USING clause'
    END as using_clause,
    CASE 
        WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
        ELSE 'No WITH CHECK clause'
    END as with_check_clause
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles'
ORDER BY cmd, policyname;

-- 6. Check for users without profiles
SELECT 
    'Users without profiles' as check_type,
    COUNT(*)::text as count
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- 7. If there are users without profiles, show them
SELECT 
    u.id,
    u.email,
    u.created_at,
    'NO PROFILE' as issue
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ORDER BY u.created_at DESC
LIMIT 10;

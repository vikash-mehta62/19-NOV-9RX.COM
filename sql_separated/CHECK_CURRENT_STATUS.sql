-- =====================================================
-- CHECK CURRENT DATABASE STATUS
-- =====================================================
-- Run this to see what's currently in your database
-- =====================================================

-- 1. Check if RLS is enabled
SELECT 
    'RLS Status' as check_name,
    CASE WHEN rowsecurity THEN 'ENABLED ✅' ELSE 'DISABLED ❌' END as status
FROM pg_tables 
WHERE tablename = 'profiles' AND schemaname = 'public';

-- 2. Check existing policies
SELECT 
    'Policy: ' || policyname as check_name,
    cmd as status
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public'
ORDER BY policyname;

-- 3. Check trigger function
SELECT 
    'Trigger Function' as check_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_name = 'handle_new_user' AND routine_schema = 'public'
    ) THEN 'EXISTS ✅' ELSE 'MISSING ❌' END as status;

-- 4. Check trigger
SELECT 
    'Trigger on auth.users' as check_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE trigger_name = 'on_auth_user_created'
    ) THEN 'EXISTS ✅' ELSE 'MISSING ❌' END as status;

-- 5. Check users vs profiles
SELECT 
    'Users in auth.users' as check_name,
    COUNT(*)::text as status
FROM auth.users;

SELECT 
    'Profiles in profiles table' as check_name,
    COUNT(*)::text as status
FROM public.profiles;

-- 6. Check users WITHOUT profiles
SELECT 
    'Users WITHOUT profiles' as check_name,
    COUNT(*)::text as status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- 7. Show users without profiles (if any)
SELECT 
    u.id,
    u.email,
    u.created_at as "User Created",
    'NO PROFILE ❌' as status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ORDER BY u.created_at DESC;

-- 8. Show recent profiles
SELECT 
    id,
    email,
    first_name,
    last_name,
    type,
    status,
    created_at
FROM public.profiles 
ORDER BY created_at DESC 
LIMIT 10;

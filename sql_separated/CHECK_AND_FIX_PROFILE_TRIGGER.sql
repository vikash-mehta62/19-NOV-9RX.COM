-- =====================================================
-- CHECK AND FIX PROFILE CREATION TRIGGER
-- =====================================================
-- This script checks if the handle_new_user trigger exists
-- and creates it if missing
-- Date: February 5, 2026
-- =====================================================

-- Step 1: Check if function exists
SELECT 
    'Function Status' as check_type,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_name = 'handle_new_user' AND routine_schema = 'public'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- Step 2: Check if trigger exists
SELECT 
    'Trigger Status' as check_type,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE trigger_name = 'on_auth_user_created'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- =====================================================
-- FIX: Create function if missing
-- =====================================================

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    display_name,
    role,
    type,
    status,
    account_status,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      CONCAT(
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        ' ',
        COALESCE(NEW.raw_user_meta_data->>'last_name', '')
      )
    ),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    COALESCE(NEW.raw_user_meta_data->>'type', 'pharmacy'),
    'pending', -- Default status
    'pending', -- Default account_status
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING; -- Don't fail if profile already exists
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- FIX: Create trigger if missing
-- =====================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- Grant necessary permissions
-- =====================================================

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- =====================================================
-- Verify the fix
-- =====================================================

SELECT 
    'Function Status (After Fix)' as check_type,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_name = 'handle_new_user' AND routine_schema = 'public'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

SELECT 
    'Trigger Status (After Fix)' as check_type,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE trigger_name = 'on_auth_user_created'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- =====================================================
-- Test: Check recent auth users and their profiles
-- =====================================================

SELECT 
    'Recent Users Check' as info,
    COUNT(*) as total_auth_users
FROM auth.users
WHERE created_at > NOW() - INTERVAL '7 days';

SELECT 
    'Recent Profiles Check' as info,
    COUNT(*) as total_profiles
FROM profiles
WHERE created_at > NOW() - INTERVAL '7 days';

-- Check for auth users without profiles (orphaned users)
SELECT 
    'Orphaned Users' as info,
    COUNT(*) as count
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL
AND au.created_at > NOW() - INTERVAL '30 days';

-- List orphaned users (if any)
SELECT 
    au.id,
    au.email,
    au.created_at,
    'Missing Profile' as issue
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL
AND au.created_at > NOW() - INTERVAL '30 days'
ORDER BY au.created_at DESC
LIMIT 10;

-- =====================================================
-- MANUAL FIX: Create profiles for orphaned users
-- =====================================================
-- Run this only if you have orphaned users

/*
INSERT INTO profiles (
    id,
    email,
    first_name,
    last_name,
    display_name,
    role,
    type,
    status,
    account_status,
    created_at,
    updated_at
)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'first_name', ''),
    COALESCE(au.raw_user_meta_data->>'last_name', ''),
    COALESCE(
        au.raw_user_meta_data->>'display_name',
        au.email
    ),
    'user',
    'pharmacy',
    'pending',
    'pending',
    au.created_at,
    NOW()
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL
AND au.created_at > NOW() - INTERVAL '30 days'
ON CONFLICT (id) DO NOTHING;
*/

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Profile creation trigger has been checked and fixed!';
    RAISE NOTICE '✅ Function: handle_new_user() created';
    RAISE NOTICE '✅ Trigger: on_auth_user_created created';
    RAISE NOTICE '✅ Permissions granted';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Next Steps:';
    RAISE NOTICE '1. Check the "Orphaned Users" query above';
    RAISE NOTICE '2. If orphaned users exist, uncomment and run the MANUAL FIX section';
    RAISE NOTICE '3. Test by creating a new user via group invitation';
END $$;

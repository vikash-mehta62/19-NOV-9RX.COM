-- =====================================================
-- Fix: User Profile Not Found Error
-- =====================================================

-- Step 1: Check if user exists in auth.users but not in profiles
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at,
  p.id as profile_id,
  CASE 
    WHEN p.id IS NULL THEN '❌ Profile Missing'
    ELSE '✅ Profile Exists'
  END as status
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email = 'jaydeepya2004@gmail.com';

-- Step 2: Create missing profile manually
-- Replace values with actual user data
INSERT INTO profiles (
  id,
  email,
  first_name,
  last_name,
  type,
  status,
  role,
  created_at,
  updated_at
)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'first_name', 'Jay'),
  COALESCE(u.raw_user_meta_data->>'last_name', 'Vekariya'),
  COALESCE(u.raw_user_meta_data->>'type', 'customer'),
  'active',
  'user',
  NOW(),
  NOW()
FROM auth.users u
WHERE u.email = 'jaydeepya2004@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = u.id
  );

-- Step 3: Verify profile was created
SELECT 
  id,
  email,
  first_name,
  last_name,
  type,
  status,
  role,
  created_at
FROM profiles
WHERE email = 'jaydeepya2004@gmail.com';

-- =====================================================
-- Fix for ALL users without profiles
-- =====================================================
-- Agar multiple users ke profiles missing hain to yeh run karein

INSERT INTO profiles (
  id,
  email,
  first_name,
  last_name,
  type,
  status,
  role,
  created_at,
  updated_at
)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'first_name', ''),
  COALESCE(u.raw_user_meta_data->>'last_name', ''),
  COALESCE(u.raw_user_meta_data->>'type', 'customer'),
  'active',
  'user',
  u.created_at,
  NOW()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = u.id
);

-- Step 4: Verify all users have profiles
SELECT 
  COUNT(*) as total_users,
  COUNT(p.id) as users_with_profiles,
  COUNT(*) - COUNT(p.id) as users_without_profiles
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id;

-- =====================================================
-- IMPORTANT: Setup Trigger for Future Users
-- =====================================================
-- Yeh trigger ensure karega ki future mein har user ka profile automatically bane

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    type,
    status,
    role,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'type', 'customer'),
    'pending',
    'user',
    NOW(),
    NOW()
  );
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- Verify Trigger is Working
-- =====================================================
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

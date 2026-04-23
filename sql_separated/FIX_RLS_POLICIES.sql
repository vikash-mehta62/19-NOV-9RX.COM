-- =====================================================
-- FIX: Row Level Security Policies for Profiles Table
-- =====================================================
-- Yeh queries apne Supabase SQL Editor mein run karein

-- Step 1: Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies (agar hain to)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;

-- Step 3: Create new policies for profiles table

-- Policy 1: Allow users to read their own profile
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

-- Policy 2: Allow users to insert their own profile during signup
CREATE POLICY "Users can insert own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Policy 3: Allow users to update their own profile
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy 4: Allow service role to read all profiles (for admin)
CREATE POLICY "Service role can read all profiles" 
ON profiles FOR SELECT 
USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

-- =====================================================
-- IMPORTANT: Trigger for Auto Profile Creation
-- =====================================================
-- Yeh trigger automatically profile create karega jab user signup karega

-- Step 4: Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, type, status, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'type')::user_type, 'pharmacy'),
    'pending',
    'user',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- Verify RLS Policies
-- =====================================================
-- Yeh query run karke check karein ki policies create hui hain ya nahi
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- =====================================================
-- Test Query (Optional)
-- =====================================================
-- Yeh query run karke test karein ki profile insert ho rahi hai ya nahi
-- SELECT * FROM profiles LIMIT 5;

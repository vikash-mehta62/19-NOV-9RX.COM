-- =====================================================
-- COMPLETE DATABASE SETUP FOR PASSWORD RESET SYSTEM
-- Run this entire script in Supabase SQL Editor
-- Database: https://asnhfgfhidhzswqkhpzz.supabase.co
-- =====================================================

-- =====================================================
-- STEP 1: Add Terms Columns to Profiles Table
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 1: Adding columns to profiles table';
  RAISE NOTICE '========================================';
END $$;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS terms_version TEXT,
ADD COLUMN IF NOT EXISTS password_reset_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_password_reset_at TIMESTAMPTZ;

-- Add comments
COMMENT ON COLUMN profiles.terms_accepted_at IS 'Timestamp when user accepted terms and conditions';
COMMENT ON COLUMN profiles.terms_version IS 'Version of terms accepted (e.g., 1.0, 2.0)';
COMMENT ON COLUMN profiles.password_reset_required IS 'Whether user needs to reset password';
COMMENT ON COLUMN profiles.last_password_reset_at IS 'Timestamp of last password reset';

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_password_reset_required ON profiles(password_reset_required) WHERE password_reset_required = true;
CREATE INDEX IF NOT EXISTS idx_profiles_terms_accepted ON profiles(terms_accepted_at);

DO $$
BEGIN
  RAISE NOTICE '✅ Profiles table updated successfully';
END $$;

-- =====================================================
-- STEP 2: Create Launch Password Resets Table
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 2: Creating launch_password_resets table';
  RAISE NOTICE '========================================';
END $$;

CREATE TABLE IF NOT EXISTS launch_password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE, -- Add UNIQUE constraint
  email TEXT NOT NULL,
  reset_token TEXT,
  email_sent_at TIMESTAMPTZ DEFAULT NOW(),
  password_reset_at TIMESTAMPTZ,
  terms_accepted_at TIMESTAMPTZ,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_launch_resets_profile_id ON launch_password_resets(profile_id);
CREATE INDEX IF NOT EXISTS idx_launch_resets_email ON launch_password_resets(email);
CREATE INDEX IF NOT EXISTS idx_launch_resets_completed ON launch_password_resets(completed);

-- Add comments
COMMENT ON TABLE launch_password_resets IS 'Tracks password reset and T&C acceptance for website launch';
COMMENT ON COLUMN launch_password_resets.profile_id IS 'Reference to user profile';
COMMENT ON COLUMN launch_password_resets.email IS 'User email address';
COMMENT ON COLUMN launch_password_resets.reset_token IS 'Password reset token from Supabase Auth';
COMMENT ON COLUMN launch_password_resets.email_sent_at IS 'When the reset email was sent';
COMMENT ON COLUMN launch_password_resets.password_reset_at IS 'When user reset their password';
COMMENT ON COLUMN launch_password_resets.terms_accepted_at IS 'When user accepted T&C';
COMMENT ON COLUMN launch_password_resets.completed IS 'True when both password reset and T&C accepted';

DO $$
BEGIN
  RAISE NOTICE '✅ launch_password_resets table created successfully';
END $$;

-- =====================================================
-- STEP 3: Enable RLS and Create Policies
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 3: Setting up Row Level Security';
  RAISE NOTICE '========================================';
END $$;

ALTER TABLE launch_password_resets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all launch resets" ON launch_password_resets;
DROP POLICY IF EXISTS "Admins can insert launch resets" ON launch_password_resets;
DROP POLICY IF EXISTS "Admins can update launch resets" ON launch_password_resets;
DROP POLICY IF EXISTS "Users can update their own launch reset" ON launch_password_resets;

-- Policy: Admins can view all records
CREATE POLICY "Admins can view all launch resets"
ON launch_password_resets
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policy: Admins can insert records
CREATE POLICY "Admins can insert launch resets"
ON launch_password_resets
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policy: Admins can update records
CREATE POLICY "Admins can update launch resets"
ON launch_password_resets
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policy: Users can update their own record
CREATE POLICY "Users can update their own launch reset"
ON launch_password_resets
FOR UPDATE
TO authenticated
USING (profile_id = auth.uid());

DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies created successfully';
END $$;

-- =====================================================
-- STEP 4: Create Trigger for Auto-Update
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 4: Creating auto-update trigger';
  RAISE NOTICE '========================================';
END $$;

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_launch_reset_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_launch_reset_updated_at ON launch_password_resets;
CREATE TRIGGER trigger_update_launch_reset_updated_at
  BEFORE UPDATE ON launch_password_resets
  FOR EACH ROW
  EXECUTE FUNCTION update_launch_reset_updated_at();

DO $$
BEGIN
  RAISE NOTICE '✅ Auto-update trigger created successfully';
END $$;

-- =====================================================
-- STEP 5: Verification
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 5: Verification';
  RAISE NOTICE '========================================';
END $$;

-- Check profiles columns
DO $$
DECLARE
  col_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_name = 'profiles'
  AND column_name IN (
    'terms_accepted_at',
    'terms_version',
    'password_reset_required',
    'last_password_reset_at'
  );
  
  IF col_count = 4 THEN
    RAISE NOTICE '✅ All 4 columns added to profiles table';
  ELSE
    RAISE NOTICE '⚠️  Only % columns found in profiles table (expected 4)', col_count;
  END IF;
END $$;

-- Check launch_password_resets table
DO $$
DECLARE
  table_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'launch_password_resets'
  ) INTO table_exists;
  
  IF table_exists THEN
    RAISE NOTICE '✅ launch_password_resets table exists';
  ELSE
    RAISE NOTICE '❌ launch_password_resets table NOT found';
  END IF;
END $$;

-- Check RLS policies
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'launch_password_resets';
  
  IF policy_count >= 4 THEN
    RAISE NOTICE '✅ RLS policies created (% policies)', policy_count;
  ELSE
    RAISE NOTICE '⚠️  Only % RLS policies found (expected 4)', policy_count;
  END IF;
END $$;

-- Check trigger
DO $$
DECLARE
  trigger_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'trigger_update_launch_reset_updated_at'
  ) INTO trigger_exists;
  
  IF trigger_exists THEN
    RAISE NOTICE '✅ Auto-update trigger exists';
  ELSE
    RAISE NOTICE '❌ Auto-update trigger NOT found';
  END IF;
END $$;

-- =====================================================
-- STEP 6: Display Summary
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🎉 DATABASE SETUP COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'What was done:';
  RAISE NOTICE '1. ✅ Added 4 columns to profiles table';
  RAISE NOTICE '2. ✅ Created launch_password_resets table';
  RAISE NOTICE '3. ✅ Enabled Row Level Security';
  RAISE NOTICE '4. ✅ Created 4 RLS policies';
  RAISE NOTICE '5. ✅ Created auto-update trigger';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Test password reset with one user';
  RAISE NOTICE '2. Send reset emails to all users from admin dashboard';
  RAISE NOTICE '3. Monitor completion in admin dashboard';
  RAISE NOTICE '';
  RAISE NOTICE 'For detailed information, see DATABASE_MIGRATION_GUIDE.md';
  RAISE NOTICE '========================================';
END $$;

-- Display detailed verification results
SELECT 
  '✅ Profiles Columns' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN (
  'terms_accepted_at',
  'terms_version',
  'password_reset_required',
  'last_password_reset_at'
)
ORDER BY column_name;

SELECT 
  '✅ Launch Resets Table' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'launch_password_resets'
ORDER BY ordinal_position;

SELECT 
  '✅ RLS Policies' as check_type,
  policyname as policy_name,
  cmd as command,
  permissive
FROM pg_policies
WHERE tablename = 'launch_password_resets'
ORDER BY policyname;

-- Complete Launch Password Reset System Setup
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. Create launch_password_resets table
-- ============================================

CREATE TABLE IF NOT EXISTS launch_password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
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

-- ============================================
-- 2. Add columns to profiles table
-- ============================================

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

-- ============================================
-- 3. Enable RLS on launch_password_resets
-- ============================================

ALTER TABLE launch_password_resets ENABLE ROW LEVEL SECURITY;

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

-- ============================================
-- 4. Create function to auto-update updated_at
-- ============================================

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

-- ============================================
-- 5. Verification queries
-- ============================================

-- Check if table exists
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_name = 'launch_password_resets';

-- Check columns in launch_password_resets
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'launch_password_resets'
ORDER BY ordinal_position;

-- Check new columns in profiles
SELECT 
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

-- Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'launch_password_resets';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Launch Password Reset System Setup Complete!';
  RAISE NOTICE '📋 Table created: launch_password_resets';
  RAISE NOTICE '📋 Columns added to profiles table';
  RAISE NOTICE '🔒 RLS policies enabled';
  RAISE NOTICE '⚡ Triggers created';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Verify tables and columns above';
  RAISE NOTICE '2. Test sending password reset email';
  RAISE NOTICE '3. Complete the flow and check admin dashboard';
END $$;

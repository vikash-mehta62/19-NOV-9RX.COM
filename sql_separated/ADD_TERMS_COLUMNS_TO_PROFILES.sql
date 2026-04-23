-- Add terms acceptance tracking columns to profiles table
-- Run this in Supabase SQL Editor

-- Add columns if they don't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS terms_version TEXT,
ADD COLUMN IF NOT EXISTS password_reset_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_password_reset_at TIMESTAMPTZ;

-- Add comment
COMMENT ON COLUMN profiles.terms_accepted_at IS 'Timestamp when user accepted terms and conditions';
COMMENT ON COLUMN profiles.terms_version IS 'Version of terms accepted (e.g., 1.0, 2.0)';
COMMENT ON COLUMN profiles.password_reset_required IS 'Whether user needs to reset password';
COMMENT ON COLUMN profiles.last_password_reset_at IS 'Timestamp of last password reset';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_password_reset_required ON profiles(password_reset_required) WHERE password_reset_required = true;
CREATE INDEX IF NOT EXISTS idx_profiles_terms_accepted ON profiles(terms_accepted_at);

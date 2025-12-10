-- Add referral_name column to profiles table
-- This field is only visible to admin users in the UI

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_name TEXT;

-- Add comment for documentation
COMMENT ON COLUMN profiles.referral_name IS 'Referral source name - visible only to admin users';

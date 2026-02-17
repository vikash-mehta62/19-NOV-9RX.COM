-- Add ACH Authorization fields to profiles table
-- These fields track user consent for ACH payments

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ach_authorization_accepted BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ach_authorization_accepted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ach_authorization_ip_address TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ach_authorization_version TEXT DEFAULT '1.0';

-- Add comments for documentation
COMMENT ON COLUMN profiles.ach_authorization_accepted IS 'Whether user has accepted ACH authorization terms';
COMMENT ON COLUMN profiles.ach_authorization_accepted_at IS 'Timestamp when ACH authorization was accepted';
COMMENT ON COLUMN profiles.ach_authorization_ip_address IS 'IP address from which ACH authorization was accepted';
COMMENT ON COLUMN profiles.ach_authorization_version IS 'Version of ACH authorization terms accepted';

-- Create index for querying ACH authorization status
CREATE INDEX IF NOT EXISTS idx_profiles_ach_authorization ON profiles(ach_authorization_accepted);

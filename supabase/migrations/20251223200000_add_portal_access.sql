-- Add portal_access column to profiles table
-- This controls whether a pharmacy user can login to the portal

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS portal_access BOOLEAN DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN profiles.portal_access IS 'Controls whether the user can login to the pharmacy portal. If false, login is blocked.';

-- Create index for faster lookups during login
CREATE INDEX IF NOT EXISTS idx_profiles_portal_access ON profiles(portal_access) WHERE portal_access = false;

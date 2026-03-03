-- Phase 2: Add new JSONB columns for privacy_policy and ach_authorization
-- (terms_and_conditions already exists)

-- Add privacy_policy JSONB column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS privacy_policy JSONB;

-- Add ach_authorization JSONB column (if not exists)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS ach_authorization JSONB;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_privacy_policy_accepted 
ON profiles ((privacy_policy->>'accepted'));

CREATE INDEX IF NOT EXISTS idx_profiles_ach_authorization_accepted 
ON profiles ((ach_authorization->>'accepted'));

-- Add comments
COMMENT ON COLUMN profiles.privacy_policy IS 'Privacy Policy acceptance data in JSONB format - single source of truth';
COMMENT ON COLUMN profiles.ach_authorization IS 'ACH Authorization acceptance data in JSONB format - single source of truth';
COMMENT ON COLUMN profiles.terms_and_conditions IS 'Terms and Conditions acceptance data in JSONB format - single source of truth';;

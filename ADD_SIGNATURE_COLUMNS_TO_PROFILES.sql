-- Add signature columns to profiles table for terms acceptance
-- Created: 2026-02-20

-- Add signature columns for all three terms types
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_signature TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS privacy_policy_signature TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ach_authorization_signature TEXT;

-- Add comments for documentation
COMMENT ON COLUMN profiles.terms_signature IS 'Digital signature for Terms of Service acceptance';
COMMENT ON COLUMN profiles.privacy_policy_signature IS 'Digital signature for Privacy Policy acceptance';
COMMENT ON COLUMN profiles.ach_authorization_signature IS 'Digital signature for ACH Authorization acceptance';
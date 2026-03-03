-- =====================================================
-- Add Terms Management Columns and Sync Data
-- Created: 2026-02-20
-- =====================================================

-- Add missing boolean columns for terms acceptance
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS privacy_policy_accepted BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ach_authorization_accepted BOOLEAN DEFAULT FALSE;

-- Add timestamp columns (terms_accepted_at already exists)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS privacy_policy_accepted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ach_authorization_accepted_at TIMESTAMP WITH TIME ZONE;

-- Sync data from existing terms_and_conditions JSONB column to new boolean columns
UPDATE profiles 
SET 
    terms_accepted = COALESCE((terms_and_conditions->>'accepted')::boolean, FALSE),
    terms_accepted_at = CASE 
        WHEN terms_and_conditions->>'acceptedAt' IS NOT NULL THEN (terms_and_conditions->>'acceptedAt')::timestamp with time zone
        WHEN terms_and_conditions->>'accepted_at' IS NOT NULL THEN (terms_and_conditions->>'accepted_at')::timestamp with time zone
        ELSE terms_accepted_at
    END
WHERE terms_and_conditions IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN profiles.terms_accepted IS 'Whether user has accepted terms of service';
COMMENT ON COLUMN profiles.terms_accepted_at IS 'Timestamp when terms were accepted';
COMMENT ON COLUMN profiles.privacy_policy_accepted IS 'Whether user has accepted privacy policy';
COMMENT ON COLUMN profiles.privacy_policy_accepted_at IS 'Timestamp when privacy policy was accepted';
COMMENT ON COLUMN profiles.ach_authorization_accepted IS 'Whether user has accepted ACH authorization';
COMMENT ON COLUMN profiles.ach_authorization_accepted_at IS 'Timestamp when ACH authorization was accepted';;

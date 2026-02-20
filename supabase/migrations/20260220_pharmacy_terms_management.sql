-- =====================================================
-- Simple Terms Management for PDF Generation
-- Created: 2026-02-20
-- =====================================================

-- Add basic terms acceptance tracking to existing profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS privacy_policy_accepted_at TIMESTAMP WITH TIME ZONE;

-- Add comments for documentation
COMMENT ON COLUMN profiles.terms_accepted IS 'Whether user has accepted terms of service';
COMMENT ON COLUMN profiles.terms_accepted_at IS 'Timestamp when terms were accepted';
COMMENT ON COLUMN profiles.privacy_policy_accepted IS 'Whether user has accepted privacy policy';
COMMENT ON COLUMN profiles.privacy_policy_accepted_at IS 'Timestamp when privacy policy was accepted';
COMMENT ON COLUMN profiles.ach_authorization_accepted IS 'Whether user has accepted ACH authorization';
COMMENT ON COLUMN profiles.ach_authorization_accepted_at IS 'Timestamp when ACH authorization was accepted';
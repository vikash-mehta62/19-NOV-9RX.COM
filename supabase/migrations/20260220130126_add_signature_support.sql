-- =====================================================
-- Add Digital Signature Support for Terms Acceptance
-- Created: 2026-02-20
-- =====================================================

-- Add signature columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_signature TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS privacy_policy_signature TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ach_authorization_signature TEXT;

-- Add signature columns to terms_acceptance_history for audit trail
ALTER TABLE terms_acceptance_history ADD COLUMN IF NOT EXISTS digital_signature TEXT;
ALTER TABLE terms_acceptance_history ADD COLUMN IF NOT EXISTS signature_method VARCHAR(50) DEFAULT 'typed_name';

-- Add comments for documentation
COMMENT ON COLUMN profiles.terms_signature IS 'Digital signature for terms of service acceptance';
COMMENT ON COLUMN profiles.privacy_policy_signature IS 'Digital signature for privacy policy acceptance';
COMMENT ON COLUMN profiles.ach_authorization_signature IS 'Digital signature for ACH authorization acceptance';
COMMENT ON COLUMN terms_acceptance_history.digital_signature IS 'Digital signature provided during acceptance';
COMMENT ON COLUMN terms_acceptance_history.signature_method IS 'Method used for signature (typed_name, drawn, uploaded)';;

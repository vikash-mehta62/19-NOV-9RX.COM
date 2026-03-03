-- Create migration helper function to convert old columns to JSONB
CREATE OR REPLACE FUNCTION migrate_terms_to_jsonb()
RETURNS void AS $$
BEGIN
  -- Migrate Terms of Service (if not already in JSONB)
  UPDATE profiles
  SET terms_and_conditions = jsonb_build_object(
    'accepted', COALESCE(terms_accepted, false),
    'acceptedAt', terms_accepted_at,
    'version', COALESCE(terms_version, '1.0'),
    'signature', terms_signature,
    'signatureMethod', CASE WHEN terms_signature IS NOT NULL THEN 'typed_name' ELSE NULL END,
    'method', 'legacy_migration'
  )
  WHERE terms_and_conditions IS NULL 
    AND (terms_accepted = true OR terms_accepted_at IS NOT NULL);

  -- Migrate Privacy Policy
  UPDATE profiles
  SET privacy_policy = jsonb_build_object(
    'accepted', COALESCE(privacy_policy_accepted, false),
    'acceptedAt', privacy_policy_accepted_at,
    'version', '1.0',
    'signature', privacy_policy_signature,
    'signatureMethod', CASE WHEN privacy_policy_signature IS NOT NULL THEN 'typed_name' ELSE NULL END,
    'method', 'legacy_migration'
  )
  WHERE privacy_policy IS NULL 
    AND (privacy_policy_accepted = true OR privacy_policy_accepted_at IS NOT NULL);

  -- Migrate ACH Authorization
  UPDATE profiles
  SET ach_authorization = jsonb_build_object(
    'accepted', COALESCE(ach_authorization_accepted, false),
    'acceptedAt', ach_authorization_accepted_at,
    'version', COALESCE(ach_authorization_version, '1.0'),
    'ipAddress', ach_authorization_ip_address,
    'signature', ach_authorization_signature,
    'signatureMethod', CASE WHEN ach_authorization_signature IS NOT NULL THEN 'typed_name' ELSE NULL END,
    'method', 'legacy_migration'
  )
  WHERE ach_authorization IS NULL 
    AND (ach_authorization_accepted = true OR ach_authorization_accepted_at IS NOT NULL);
END;
$$ LANGUAGE plpgsql;

-- Create helper functions for checking acceptance status
CREATE OR REPLACE FUNCTION has_accepted_terms(profile_row profiles)
RETURNS boolean AS $$
BEGIN
  RETURN COALESCE((profile_row.terms_and_conditions->>'accepted')::boolean, false);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION has_accepted_privacy(profile_row profiles)
RETURNS boolean AS $$
BEGIN
  RETURN COALESCE((profile_row.privacy_policy->>'accepted')::boolean, false);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION has_accepted_ach(profile_row profiles)
RETURNS boolean AS $$
BEGIN
  RETURN COALESCE((profile_row.ach_authorization->>'accepted')::boolean, false);
END;
$$ LANGUAGE plpgsql IMMUTABLE;;

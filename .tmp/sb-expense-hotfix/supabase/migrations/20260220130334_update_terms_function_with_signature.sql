-- =====================================================
-- Update Terms Acceptance Function to Handle Signatures
-- Created: 2026-02-20
-- =====================================================

-- Update the record_terms_acceptance function to support signatures
CREATE OR REPLACE FUNCTION public.record_terms_acceptance(
  p_profile_id uuid, 
  p_terms_type character varying, 
  p_terms_version character varying, 
  p_ip_address inet DEFAULT NULL::inet, 
  p_user_agent text DEFAULT NULL::text, 
  p_acceptance_method character varying DEFAULT 'web_form'::character varying, 
  p_document_url text DEFAULT NULL::text, 
  p_notes text DEFAULT NULL::text,
  p_digital_signature text DEFAULT NULL::text,
  p_signature_method character varying DEFAULT 'typed_name'::character varying
)
RETURNS uuid
LANGUAGE plpgsql
AS $function$
DECLARE
  acceptance_id UUID;
  document_hash VARCHAR(64);
  current_terms_json JSONB;
BEGIN
  -- Get document hash if document exists
  SELECT content_hash INTO document_hash
  FROM terms_documents
  WHERE document_type = p_terms_type AND version = p_terms_version AND is_active = true;
  
  -- Insert acceptance record with signature
  INSERT INTO terms_acceptance_history (
    profile_id, terms_type, terms_version, ip_address, user_agent,
    acceptance_method, document_url, document_hash, notes,
    digital_signature, signature_method
  ) VALUES (
    p_profile_id, p_terms_type, p_terms_version, p_ip_address, p_user_agent,
    p_acceptance_method, p_document_url, document_hash, p_notes,
    p_digital_signature, p_signature_method
  ) RETURNING id INTO acceptance_id;
  
  -- Get current terms_and_conditions JSONB for backward compatibility
  SELECT COALESCE(terms_and_conditions, '{}'::jsonb) INTO current_terms_json
  FROM profiles WHERE id = p_profile_id;
  
  -- Update profile with latest acceptance
  UPDATE profiles SET
    terms_accepted = CASE WHEN p_terms_type = 'terms_of_service' THEN true ELSE terms_accepted END,
    terms_accepted_at = CASE WHEN p_terms_type = 'terms_of_service' THEN NOW() ELSE terms_accepted_at END,
    terms_signature = CASE WHEN p_terms_type = 'terms_of_service' THEN p_digital_signature ELSE terms_signature END,
    privacy_policy_accepted = CASE WHEN p_terms_type = 'privacy_policy' THEN true ELSE privacy_policy_accepted END,
    privacy_policy_accepted_at = CASE WHEN p_terms_type = 'privacy_policy' THEN NOW() ELSE privacy_policy_accepted_at END,
    privacy_policy_signature = CASE WHEN p_terms_type = 'privacy_policy' THEN p_digital_signature ELSE privacy_policy_signature END,
    ach_authorization_accepted = CASE WHEN p_terms_type = 'ach_authorization' THEN true ELSE ach_authorization_accepted END,
    ach_authorization_accepted_at = CASE WHEN p_terms_type = 'ach_authorization' THEN NOW() ELSE ach_authorization_accepted_at END,
    ach_authorization_signature = CASE WHEN p_terms_type = 'ach_authorization' THEN p_digital_signature ELSE ach_authorization_signature END,
    ach_authorization_version = CASE WHEN p_terms_type = 'ach_authorization' THEN p_terms_version ELSE ach_authorization_version END,
    ach_authorization_ip_address = CASE WHEN p_terms_type = 'ach_authorization' THEN p_ip_address::TEXT ELSE ach_authorization_ip_address END,
    -- Update JSONB for backward compatibility
    terms_and_conditions = CASE 
      WHEN p_terms_type = 'terms_of_service' THEN 
        current_terms_json || jsonb_build_object(
          'accepted', true,
          'acceptedAt', NOW()::text,
          'version', p_terms_version,
          'ipAddress', COALESCE(p_ip_address::text, ''),
          'userAgent', COALESCE(p_user_agent, ''),
          'method', p_acceptance_method,
          'signature', COALESCE(p_digital_signature, '')
        )
      ELSE terms_and_conditions 
    END,
    terms_version = CASE WHEN p_terms_type = 'terms_of_service' THEN p_terms_version ELSE terms_version END
  WHERE id = p_profile_id;
  
  RETURN acceptance_id;
END;
$function$;;

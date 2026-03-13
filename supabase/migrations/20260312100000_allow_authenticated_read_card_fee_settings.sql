-- Allow any authenticated user to read card processing fee settings from admin's settings row.
-- This is needed because the "settings" table RLS only allows users to read their own row,
-- but pharmacy users need to see the admin-configured card processing fee during checkout.

-- Create a SECURITY DEFINER function that bypasses RLS to return only the fee columns
CREATE OR REPLACE FUNCTION public.get_card_processing_fee_settings()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Find the earliest admin/superadmin profile and return their fee settings
  SELECT jsonb_build_object(
    'cardProcessingFeeEnabled', COALESCE(s.card_processing_fee_enabled, false),
    'cardProcessingFeePercentage', COALESCE(s.card_processing_fee_percentage, 0),
    'cardProcessingFeePassToCustomer', COALESCE(s.card_processing_fee_pass_to_customer, false)
  ) INTO result
  FROM profiles p
  JOIN settings s ON s.profile_id = p.id
  WHERE p.role IN ('admin', 'superadmin')
  ORDER BY p.created_at ASC
  LIMIT 1;

  -- Return defaults if no admin settings found
  IF result IS NULL THEN
    result := jsonb_build_object(
      'cardProcessingFeeEnabled', false,
      'cardProcessingFeePercentage', 0,
      'cardProcessingFeePassToCustomer', false
    );
  END IF;

  RETURN result;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_card_processing_fee_settings() TO authenticated;
-- Revoke from anon for security
REVOKE EXECUTE ON FUNCTION public.get_card_processing_fee_settings() FROM anon;

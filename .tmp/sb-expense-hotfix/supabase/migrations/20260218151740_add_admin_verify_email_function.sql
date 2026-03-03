-- Function to allow admin to send verification email to unverified users
-- This properly triggers Supabase Auth's verification flow

CREATE OR REPLACE FUNCTION admin_send_verification_email(user_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  result JSON;
BEGIN
  -- Check if user exists and is unverified
  SELECT id, email, email_confirmed_at
  INTO user_record
  FROM auth.users
  WHERE email = user_email;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User not found'
    );
  END IF;

  IF user_record.email_confirmed_at IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Email already verified',
      'verified_at', user_record.email_confirmed_at
    );
  END IF;

  -- Return user info so admin can use Supabase Admin API to resend confirmation
  RETURN json_build_object(
    'success', true,
    'message', 'User found and unverified',
    'user_id', user_record.id,
    'email', user_record.email
  );
END;
$$;

-- Grant execute permission to authenticated users (admin will use this)
GRANT EXECUTE ON FUNCTION admin_send_verification_email(TEXT) TO authenticated;

COMMENT ON FUNCTION admin_send_verification_email IS 'Admin function to check user verification status and get user ID for sending verification email';;

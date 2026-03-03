-- Function to check if user's email is verified
-- Returns email_confirmed_at timestamp or null
CREATE OR REPLACE FUNCTION check_email_verification(user_email TEXT)
RETURNS TABLE(
  email_confirmed BOOLEAN,
  confirmed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (email_confirmed_at IS NOT NULL) as email_confirmed,
    email_confirmed_at as confirmed_at
  FROM auth.users
  WHERE email = user_email
  LIMIT 1;
END;
$$;

-- Grant execute to anon (for login flow)
GRANT EXECUTE ON FUNCTION check_email_verification(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION check_email_verification(TEXT) TO authenticated;

COMMENT ON FUNCTION check_email_verification IS 'Check if user email is verified by querying auth.users.email_confirmed_at';;

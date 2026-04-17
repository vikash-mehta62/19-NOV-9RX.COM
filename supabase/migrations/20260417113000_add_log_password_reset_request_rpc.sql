-- Log password reset requests through a controlled RPC so pre-login users
-- can create request records without requiring direct table insert access.

CREATE OR REPLACE FUNCTION public.log_password_reset_request(
  p_user_id uuid,
  p_email text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_request_id uuid;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  IF p_email IS NULL OR btrim(p_email) = '' THEN
    RAISE EXCEPTION 'p_email is required';
  END IF;

  INSERT INTO public.password_reset_requests (
    user_id,
    email,
    requested_at
  )
  VALUES (
    p_user_id,
    lower(btrim(p_email)),
    now()
  )
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_password_reset_request(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_password_reset_request(uuid, text) TO anon, authenticated;

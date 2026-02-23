-- =====================================================
-- RPC: accept_credit_terms_update_line
-- SECURITY DEFINER — bypasses RLS so pharmacy users
-- can insert/update their own user_credit_lines row
-- when they accept credit terms.
-- =====================================================

CREATE OR REPLACE FUNCTION public.accept_credit_terms_update_line(
  p_user_id UUID,
  p_new_total_limit NUMERIC,
  p_available_credit NUMERIC,
  p_used_credit NUMERIC,
  p_net_terms INTEGER,
  p_interest_rate NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id UUID;
BEGIN
  -- Only allow users to update their own credit line
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not authorized to update another user''s credit line';
  END IF;

  -- Check for existing active credit line
  SELECT id INTO v_existing_id
  FROM user_credit_lines
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Update existing credit line
    UPDATE user_credit_lines
    SET credit_limit = p_new_total_limit,
        available_credit = p_available_credit,
        used_credit = p_used_credit,
        net_terms = p_net_terms,
        interest_rate = p_interest_rate,
        status = 'active'
    WHERE id = v_existing_id;
  ELSE
    -- Insert new credit line
    INSERT INTO user_credit_lines (
      user_id, credit_limit, available_credit, used_credit,
      net_terms, interest_rate, status, payment_score
    ) VALUES (
      p_user_id, p_new_total_limit, p_available_credit, p_used_credit,
      p_net_terms, p_interest_rate, 'active', 100
    );
  END IF;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.accept_credit_terms_update_line TO authenticated;

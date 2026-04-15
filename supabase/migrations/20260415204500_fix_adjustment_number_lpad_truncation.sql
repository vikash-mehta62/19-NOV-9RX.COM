-- Fix ADJ number truncation for sequence values with more than 6 digits.
-- PostgreSQL LPAD(text, 6, '0') truncates longer strings to 6 characters.

CREATE OR REPLACE FUNCTION public.generate_adjustment_number()
RETURNS TEXT AS $$
DECLARE
  v_next BIGINT;
BEGIN
  v_next := nextval('public.payment_adjustment_number_seq');
  RETURN 'ADJ' || CASE
    WHEN LENGTH(v_next::TEXT) < 6 THEN LPAD(v_next::TEXT, 6, '0')
    ELSE v_next::TEXT
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.generate_adjustment_number() TO anon, authenticated, service_role;

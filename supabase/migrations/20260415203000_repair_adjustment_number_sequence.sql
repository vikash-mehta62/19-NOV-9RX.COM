-- Keep payment adjustment numbers concurrency-safe and repairable.
--
-- The generator must use nextval() only. Computing MAX(...) + 1 inside the
-- generator is race-prone when the RPC call and insert happen as separate
-- requests. The sync function is only for repairing a sequence that is behind
-- already-existing adjustment numbers.

CREATE SEQUENCE IF NOT EXISTS public.payment_adjustment_number_seq
  AS BIGINT
  MINVALUE 1
  START WITH 1;

CREATE OR REPLACE FUNCTION public.sync_payment_adjustment_number_sequence()
RETURNS BIGINT AS $$
DECLARE
  v_max_existing BIGINT;
  v_last_value BIGINT;
  v_is_called BOOLEAN;
  v_synced_to BIGINT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('public.payment_adjustment_number_seq'));

  SELECT COALESCE(
    MAX(
      CASE
        WHEN adjustment_number ~ '[0-9]'
        THEN NULLIF(REGEXP_REPLACE(adjustment_number, '[^0-9]', '', 'g'), '')::BIGINT
        ELSE NULL
      END
    ),
    0
  )
  INTO v_max_existing
  FROM public.payment_adjustments
  WHERE adjustment_number LIKE 'ADJ%';

  SELECT last_value, is_called
  INTO v_last_value, v_is_called
  FROM public.payment_adjustment_number_seq;

  v_synced_to := GREATEST(v_max_existing, CASE WHEN v_is_called THEN v_last_value ELSE 0 END);

  IF v_synced_to > 0 THEN
    PERFORM setval('public.payment_adjustment_number_seq', v_synced_to, true);
  ELSE
    PERFORM setval('public.payment_adjustment_number_seq', 1, false);
  END IF;

  RETURN v_synced_to;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

SELECT public.sync_payment_adjustment_number_sequence();

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
GRANT EXECUTE ON FUNCTION public.sync_payment_adjustment_number_sequence() TO anon, authenticated, service_role;

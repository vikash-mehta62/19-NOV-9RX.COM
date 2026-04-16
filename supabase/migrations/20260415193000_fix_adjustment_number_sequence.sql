-- Fix duplicate adjustment_number generation under concurrent writes.
-- Replaces MAX()+1 strategy with a database sequence.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class
    WHERE relkind = 'S'
      AND relname = 'payment_adjustment_number_seq'
  ) THEN
    CREATE SEQUENCE public.payment_adjustment_number_seq;
  END IF;
END
$$;

DO $$
DECLARE
  v_max_adjustment BIGINT;
BEGIN
  SELECT COALESCE(
    MAX(NULLIF(REGEXP_REPLACE(adjustment_number, '\D', '', 'g'), '')::BIGINT),
    0
  )
  INTO v_max_adjustment
  FROM public.payment_adjustments
  WHERE adjustment_number LIKE 'ADJ%';

  -- Set sequence to current max so next nextval() yields max + 1
  PERFORM setval('public.payment_adjustment_number_seq', GREATEST(v_max_adjustment, 0), true);
END
$$;

CREATE OR REPLACE FUNCTION public.generate_adjustment_number()
RETURNS TEXT AS $$
DECLARE
  v_counter BIGINT;
BEGIN
  v_counter := nextval('public.payment_adjustment_number_seq');
  RETURN 'ADJ' || LPAD(v_counter::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;


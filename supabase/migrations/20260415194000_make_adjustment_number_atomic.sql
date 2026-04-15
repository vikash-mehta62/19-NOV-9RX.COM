-- Make payment adjustment numbers concurrency-safe.
-- MAX(...) + 1 is race-prone under parallel requests and can violate
-- payment_adjustments_adjustment_number_key.

CREATE SEQUENCE IF NOT EXISTS public.payment_adjustment_number_seq
	AS BIGINT
	MINVALUE 1
	START WITH 1;

DO $$
DECLARE
	v_max_existing BIGINT;
BEGIN
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

	IF v_max_existing > 0 THEN
		PERFORM setval('public.payment_adjustment_number_seq', v_max_existing, true);
	ELSE
		PERFORM setval('public.payment_adjustment_number_seq', 1, false);
	END IF;
END $$;

CREATE OR REPLACE FUNCTION public.generate_adjustment_number()
RETURNS TEXT AS $$
DECLARE
	v_next BIGINT;
BEGIN
	v_next := nextval('public.payment_adjustment_number_seq');
	RETURN 'ADJ' || LPAD(v_next::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;


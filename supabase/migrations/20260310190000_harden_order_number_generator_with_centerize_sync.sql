-- Harden order-number generation to avoid duplicates permanently.
-- Goals:
-- 1) Use a single atomic counter source (centerize_data.order_no) for serialization.
-- 2) Self-heal if counters drift behind existing orders.
-- 3) Keep settings.next_order_number aligned for admin visibility.
-- 4) Respect configurable prefix (centerize_data.order_start / settings.order_number_prefix).

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_prefix TEXT := '9RX';
  v_centerize_id BIGINT;
  v_centerize_next BIGINT;
  v_settings_prefix TEXT;
  v_settings_next BIGINT;
  v_existing_next BIGINT := 1000;
  v_next BIGINT;
BEGIN
  -- Lock centerize_data row when available (single-row counter source).
  IF to_regclass('public.centerize_data') IS NOT NULL THEN
    BEGIN
      SELECT c.id,
             COALESCE(NULLIF(BTRIM(c.order_start), ''), '9RX'),
             COALESCE(c.order_no::BIGINT, 1000)
      INTO v_centerize_id, v_prefix, v_centerize_next
      FROM public.centerize_data c
      ORDER BY c.id DESC
      LIMIT 1
      FOR UPDATE;
    EXCEPTION
      WHEN undefined_column THEN
        v_centerize_id := NULL;
        v_centerize_next := NULL;
    END;
  END IF;

  -- Read settings max counter/prefix as secondary source.
  IF to_regclass('public.settings') IS NOT NULL THEN
    BEGIN
      SELECT
        COALESCE(NULLIF(BTRIM(MAX(s.order_number_prefix)), ''), NULL),
        COALESCE(MAX(s.next_order_number)::BIGINT, 1000)
      INTO v_settings_prefix, v_settings_next
      FROM public.settings s;
    EXCEPTION
      WHEN undefined_column THEN
        v_settings_prefix := NULL;
        v_settings_next := NULL;
    END;
  END IF;

  -- Prefix normalization for legacy malformed values.
  v_prefix := REPLACE(REPLACE(BTRIM(COALESCE(v_prefix, v_settings_prefix, '9RX')), '''', ''), '::text', '');
  IF v_prefix = '' OR LOWER(v_prefix) = 'ord' THEN
    v_prefix := '9RX';
  END IF;

  -- Calculate next value from existing orders for this prefix.
  SELECT COALESCE(
           MAX(
             CASE
               WHEN SUBSTRING(o.order_number FROM CHAR_LENGTH(v_prefix) + 1) ~ '^[0-9]+$'
                 THEN (SUBSTRING(o.order_number FROM CHAR_LENGTH(v_prefix) + 1))::BIGINT
               ELSE NULL
             END
           ),
           999
         ) + 1
  INTO v_existing_next
  FROM public.orders o
  WHERE o.order_number LIKE v_prefix || '%';

  -- Choose safest counter: never go backwards.
  v_next := GREATEST(
    COALESCE(v_centerize_next, 1000),
    COALESCE(v_settings_next, 1000),
    COALESCE(v_existing_next, 1000)
  );

  -- Persist next counter to centerize_data.
  IF v_centerize_id IS NOT NULL THEN
    UPDATE public.centerize_data c
    SET order_no = v_next + 1,
        order_start = v_prefix
    WHERE c.id = v_centerize_id;
  ELSIF to_regclass('public.centerize_data') IS NOT NULL THEN
    BEGIN
      INSERT INTO public.centerize_data (order_no, order_start)
      VALUES (v_next + 1, v_prefix);
    EXCEPTION
      WHEN undefined_column THEN
        NULL;
    END;
  END IF;

  -- Keep settings counters aligned for UI/admin visibility.
  IF to_regclass('public.settings') IS NOT NULL THEN
    BEGIN
      UPDATE public.settings s
      SET next_order_number = GREATEST(COALESCE(s.next_order_number, 0), v_next + 1),
          order_number_prefix = COALESCE(NULLIF(BTRIM(s.order_number_prefix), ''), v_prefix)
      WHERE COALESCE(s.next_order_number, 0) < v_next + 1
         OR COALESCE(NULLIF(BTRIM(s.order_number_prefix), ''), '') = '';
    EXCEPTION
      WHEN undefined_column THEN
        NULL;
    END;
  END IF;

  RETURN v_prefix || LPAD(v_next::TEXT, 6, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_order_number() TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'Order number generator hardened with centerize_data + self-healing counters.';
END $$;


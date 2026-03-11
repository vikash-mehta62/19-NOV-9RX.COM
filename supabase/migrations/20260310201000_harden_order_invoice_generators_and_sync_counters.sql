-- Hardening: order/invoice number generation and counter sync.
-- This migration makes both generators self-heal from existing rows to prevent
-- duplicate key violations when counters drift or settings has multiple rows.

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_prefix TEXT := '9RX';
  v_centerize_id BIGINT;
  v_centerize_latest BIGINT;
  v_settings_prefix TEXT;
  v_settings_next BIGINT;
  v_existing_latest BIGINT := 999;
  v_generate BIGINT;
BEGIN
  IF to_regclass('public.centerize_data') IS NOT NULL THEN
    BEGIN
      SELECT c.id,
             COALESCE(NULLIF(BTRIM(c.order_start), ''), '9RX'),
             COALESCE(c.order_no::BIGINT, 999)
      INTO v_centerize_id, v_prefix, v_centerize_latest
      FROM public.centerize_data c
      ORDER BY c.id DESC
      LIMIT 1
      FOR UPDATE;
    EXCEPTION
      WHEN undefined_column THEN
        v_centerize_id := NULL;
        v_centerize_latest := NULL;
    END;
  END IF;

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

  v_prefix := REPLACE(REPLACE(BTRIM(COALESCE(v_prefix, v_settings_prefix, '9RX')), '''', ''), '::text', '');
  IF v_prefix = '' OR LOWER(v_prefix) = 'ord' THEN
    v_prefix := '9RX';
  END IF;

  SELECT COALESCE(
           MAX(
             CASE
               WHEN NULLIF(
                 REGEXP_REPLACE(
                   SUBSTRING(o.order_number FROM CHAR_LENGTH(v_prefix) + 1),
                   '[^0-9]',
                   '',
                   'g'
                 ),
                 ''
               ) ~ '^[0-9]+$'
               THEN (
                 REGEXP_REPLACE(
                   SUBSTRING(o.order_number FROM CHAR_LENGTH(v_prefix) + 1),
                   '[^0-9]',
                   '',
                   'g'
                 )
               )::BIGINT
               ELSE NULL
             END
           ),
           999
         )
  INTO v_existing_latest
  FROM public.orders o
  WHERE o.order_number LIKE v_prefix || '%';

  v_generate := GREATEST(
    COALESCE(v_centerize_latest, 999) + 1,
    COALESCE(v_settings_next, 1000),
    COALESCE(v_existing_latest, 999) + 1,
    1000
  );

  IF v_centerize_id IS NOT NULL THEN
    UPDATE public.centerize_data c
    SET order_no = v_generate,
        order_start = v_prefix
    WHERE c.id = v_centerize_id;
  ELSIF to_regclass('public.centerize_data') IS NOT NULL THEN
    BEGIN
      INSERT INTO public.centerize_data (order_no, order_start)
      VALUES (v_generate, v_prefix);
    EXCEPTION
      WHEN undefined_column THEN
        NULL;
    END;
  END IF;

  IF to_regclass('public.settings') IS NOT NULL THEN
    BEGIN
      UPDATE public.settings s
      SET next_order_number = GREATEST(COALESCE(s.next_order_number, 0), v_generate + 1),
          order_number_prefix = COALESCE(NULLIF(BTRIM(s.order_number_prefix), ''), v_prefix)
      WHERE COALESCE(s.next_order_number, 0) < v_generate + 1
         OR COALESCE(NULLIF(BTRIM(s.order_number_prefix), ''), '') = '';
    EXCEPTION
      WHEN undefined_column THEN
        NULL;
    END;
  END IF;

  RETURN v_prefix || LPAD(v_generate::TEXT, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_prefix TEXT := 'INV';
  v_prefix_pattern TEXT;
  v_centerize_id BIGINT;
  v_centerize_latest BIGINT;
  v_settings_prefix TEXT;
  v_settings_next BIGINT;
  v_existing_latest BIGINT := 999;
  v_generate BIGINT;
BEGIN
  IF to_regclass('public.centerize_data') IS NOT NULL THEN
    BEGIN
      SELECT c.id,
             COALESCE(NULLIF(BTRIM(c.invoice_start), ''), 'INV'),
             COALESCE(c.invoice_no::BIGINT, 999)
      INTO v_centerize_id, v_prefix, v_centerize_latest
      FROM public.centerize_data c
      ORDER BY c.id DESC
      LIMIT 1
      FOR UPDATE;
    EXCEPTION
      WHEN undefined_column THEN
        v_centerize_id := NULL;
        v_centerize_latest := NULL;
    END;
  END IF;

  IF to_regclass('public.settings') IS NOT NULL THEN
    BEGIN
      SELECT
        COALESCE(NULLIF(BTRIM(MAX(s.invoice_prefix)), ''), NULL),
        COALESCE(MAX(s.next_invoice_number)::BIGINT, 1000)
      INTO v_settings_prefix, v_settings_next
      FROM public.settings s;
    EXCEPTION
      WHEN undefined_column THEN
        v_settings_prefix := NULL;
        v_settings_next := NULL;
    END;
  END IF;

  v_prefix := REPLACE(REPLACE(BTRIM(COALESCE(v_prefix, v_settings_prefix, 'INV')), '''', ''), '::text', '');
  IF v_prefix = '' THEN
    v_prefix := 'INV';
  END IF;
  -- Prefix is expected to be simple admin input (INV-style); use directly in regex checks.
  v_prefix_pattern := v_prefix;

  SELECT COALESCE(
           MAX(
             counter_value
           ),
           999
         )
  INTO v_existing_latest
  FROM (
    SELECT
      CASE
        -- Preferred pattern: INV-YYYY###### (counter extracted after year).
        WHEN i.invoice_number ~ ('^' || v_prefix_pattern || '-[0-9]{4}[0-9]{1,10}$')
          THEN (
            SUBSTRING(i.invoice_number FROM ('^' || v_prefix_pattern || '-[0-9]{4}([0-9]{1,10})$'))
          )::BIGINT
        -- Legacy numeric patterns: INV###### or INV-######.
        WHEN i.invoice_number ~ ('^' || v_prefix_pattern || '-?[0-9]{1,10}$')
          THEN (
            SUBSTRING(i.invoice_number FROM ('^' || v_prefix_pattern || '-?([0-9]{1,10})$'))
          )::BIGINT
        ELSE NULL
      END AS counter_value
    FROM public.invoices i
    WHERE i.invoice_number LIKE v_prefix || '%'
  ) parsed;

  v_generate := GREATEST(
    COALESCE(v_centerize_latest, 999) + 1,
    COALESCE(v_settings_next, 1000),
    COALESCE(v_existing_latest, 999) + 1,
    1000
  );

  IF v_centerize_id IS NOT NULL THEN
    UPDATE public.centerize_data c
    SET invoice_no = v_generate,
        invoice_start = v_prefix
    WHERE c.id = v_centerize_id;
  ELSIF to_regclass('public.centerize_data') IS NOT NULL THEN
    BEGIN
      INSERT INTO public.centerize_data (invoice_no, invoice_start)
      VALUES (v_generate, v_prefix);
    EXCEPTION
      WHEN undefined_column THEN
        NULL;
    END;
  END IF;

  IF to_regclass('public.settings') IS NOT NULL THEN
    BEGIN
      UPDATE public.settings s
      SET next_invoice_number = GREATEST(COALESCE(s.next_invoice_number, 0), v_generate + 1),
          invoice_prefix = COALESCE(NULLIF(BTRIM(s.invoice_prefix), ''), v_prefix)
      WHERE COALESCE(s.next_invoice_number, 0) < v_generate + 1
         OR COALESCE(NULLIF(BTRIM(s.invoice_prefix), ''), '') = '';
    EXCEPTION
      WHEN undefined_column THEN
        NULL;
    END;
  END IF;

  RETURN v_prefix || '-' || TO_CHAR(NOW(), 'YYYY') || LPAD(v_generate::TEXT, 6, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_order_number() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_invoice_number() TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'Hardened order/invoice generators with counter self-healing and centerize/settings sync.';
END $$;

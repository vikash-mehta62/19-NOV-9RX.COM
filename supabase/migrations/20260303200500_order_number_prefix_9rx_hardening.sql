-- Ensure Sales Order numbering uses 9RX prefix consistently.
-- 1) Normalize existing settings values that still hold ORD variants.
-- 2) Make settings default 9RX for future rows.
-- 3) Harden generate_order_number() against malformed/legacy prefix strings.

ALTER TABLE public.settings
  ALTER COLUMN order_number_prefix SET DEFAULT '9RX';

UPDATE public.settings
SET order_number_prefix = '9RX',
    updated_at = NOW()
WHERE order_number_prefix IS NULL
   OR BTRIM(order_number_prefix) = ''
   OR LOWER(
        REPLACE(
          REPLACE(BTRIM(order_number_prefix), '''', ''),
          '::text',
          ''
        )
      ) = 'ord';

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id UUID;
  v_prefix TEXT := '9RX';
  v_next BIGINT;
BEGIN
  IF to_regclass('public.settings') IS NOT NULL THEN
    BEGIN
      SELECT s.id,
             COALESCE(NULLIF(BTRIM(s.order_number_prefix), ''), '9RX'),
             COALESCE(s.next_order_number, 1000)
      INTO v_id, v_prefix, v_next
      FROM public.settings s
      ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC NULLS LAST
      LIMIT 1
      FOR UPDATE;

      IF v_id IS NOT NULL THEN
        -- Normalize malformed historic values like "'ORD'::text"
        v_prefix := REPLACE(REPLACE(BTRIM(v_prefix), '''', ''), '::text', '');
        IF LOWER(v_prefix) = 'ord' OR v_prefix = '' THEN
          v_prefix := '9RX';
        END IF;

        UPDATE public.settings
        SET next_order_number = v_next + 1
        WHERE id = v_id;

        RETURN v_prefix || LPAD(v_next::TEXT, 6, '0');
      END IF;
    EXCEPTION
      WHEN undefined_column THEN
        NULL;
    END;
  END IF;

  RETURN '9RX' || RIGHT((EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT::TEXT, 8);
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_order_number() TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'Order number prefix hardening applied: 9RX';
END $$;

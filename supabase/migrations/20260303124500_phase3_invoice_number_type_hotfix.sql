-- Phase 3k: generate_invoice_number type-safety hotfix
-- Fixes environments where public.centerize_data.id is not UUID.
-- Safe to run multiple times.

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_centerize RECORD;
  v_settings RECORD;
  v_invoice_start TEXT := 'INV';
  v_invoice_no BIGINT;
BEGIN
  -- Prefer centerize_data counter when available.
  IF to_regclass('public.centerize_data') IS NOT NULL THEN
    BEGIN
      SELECT c.*
      INTO v_centerize
      FROM public.centerize_data c
      ORDER BY c.id DESC
      LIMIT 1
      FOR UPDATE;

      IF FOUND THEN
        v_invoice_start := COALESCE(NULLIF((v_centerize.invoice_start)::TEXT, ''), 'INV');
        v_invoice_no := COALESCE((v_centerize.invoice_no)::BIGINT, 0) + 1;

        UPDATE public.centerize_data c
        SET invoice_no = v_invoice_no
        WHERE c.id = v_centerize.id;

        RETURN v_invoice_start || '-' || TO_CHAR(NOW(), 'YYYY') || LPAD(v_invoice_no::TEXT, 6, '0');
      END IF;
    EXCEPTION
      WHEN undefined_column THEN
        NULL;
    END;
  END IF;

  -- Fallback to settings counter.
  IF to_regclass('public.settings') IS NOT NULL THEN
    BEGIN
      SELECT s.*
      INTO v_settings
      FROM public.settings s
      ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC NULLS LAST
      LIMIT 1
      FOR UPDATE;

      IF FOUND THEN
        v_invoice_no := COALESCE((v_settings.next_invoice_number)::BIGINT, 1000);

        UPDATE public.settings s
        SET next_invoice_number = v_invoice_no + 1
        WHERE s.id = v_settings.id;

        RETURN 'INV-' || TO_CHAR(NOW(), 'YYYY') || LPAD(v_invoice_no::TEXT, 6, '0');
      END IF;
    EXCEPTION
      WHEN undefined_column THEN
        NULL;
    END;
  END IF;

  -- Last-resort fallback.
  RETURN 'INV-' || TO_CHAR(NOW(), 'YYYYMMDDHH24MISSMS');
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_invoice_number() TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'Phase 3k generate_invoice_number type hotfix applied successfully.';
END $$;

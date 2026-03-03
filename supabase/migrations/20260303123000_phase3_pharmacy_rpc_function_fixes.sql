-- Phase 3j: Pharmacy RPC function fixes
-- Purpose:
-- 1) Fix promo validation function using outdated orders.user_id reference.
-- 2) Ensure number-generator RPCs always return deterministic values.
-- 3) Re-grant execute for authenticated role after Phase 3 function lockdown.
-- Safe to run multiple times.

-- ---------------------------------------------------------------------------
-- validate_promo_code: align to orders.profile_id
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_promo_code(
  p_code VARCHAR,
  p_user_id UUID,
  p_order_amount DECIMAL
)
RETURNS TABLE (
  valid BOOLEAN,
  offer_id UUID,
  discount_type VARCHAR,
  discount_value DECIMAL,
  max_discount DECIMAL,
  message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_offer RECORD;
  v_user_type VARCHAR;
  v_is_first_order BOOLEAN;
BEGIN
  SELECT * INTO v_offer
  FROM public.offers
  WHERE promo_code = UPPER(p_code)
    AND COALESCE(is_active, true) = true
    AND (start_date IS NULL OR start_date <= NOW())
    AND (end_date IS NULL OR end_date >= NOW());

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR, NULL::DECIMAL, NULL::DECIMAL, 'Invalid or expired promo code'::TEXT;
    RETURN;
  END IF;

  IF v_offer.usage_limit IS NOT NULL AND COALESCE(v_offer.used_count, 0) >= v_offer.usage_limit THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR, NULL::DECIMAL, NULL::DECIMAL, 'Promo code usage limit reached'::TEXT;
    RETURN;
  END IF;

  IF v_offer.min_order_amount IS NOT NULL AND p_order_amount < v_offer.min_order_amount THEN
    RETURN QUERY
      SELECT false, NULL::UUID, NULL::VARCHAR, NULL::DECIMAL, NULL::DECIMAL,
             ('Minimum order amount is $' || v_offer.min_order_amount)::TEXT;
    RETURN;
  END IF;

  IF v_offer.applicable_to = 'first_order' THEN
    SELECT COUNT(*) = 0
    INTO v_is_first_order
    FROM public.orders o
    WHERE o.profile_id = p_user_id
      AND COALESCE(o.status, '') <> 'cancelled'
      AND COALESCE(o.void, false) IS NOT TRUE;

    IF NOT v_is_first_order THEN
      RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR, NULL::DECIMAL, NULL::DECIMAL, 'This offer is only for first orders'::TEXT;
      RETURN;
    END IF;
  END IF;

  IF v_offer.applicable_to = 'user_group' AND v_offer.user_groups IS NOT NULL THEN
    SELECT p.type::TEXT
    INTO v_user_type
    FROM public.profiles p
    WHERE p.id = p_user_id;

    IF v_user_type IS NULL OR NOT (v_user_type = ANY(v_offer.user_groups)) THEN
      RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR, NULL::DECIMAL, NULL::DECIMAL, 'This offer is not available for your account type'::TEXT;
      RETURN;
    END IF;
  END IF;

  RETURN QUERY
    SELECT true,
           v_offer.id,
           v_offer.offer_type::VARCHAR,
           v_offer.discount_value,
           v_offer.max_discount_amount,
           'Promo code applied successfully'::TEXT;
END;
$$;

-- ---------------------------------------------------------------------------
-- Number generators: always return (no fall-through)
-- ---------------------------------------------------------------------------
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
             COALESCE(NULLIF(s.order_number_prefix, ''), '9RX'),
             COALESCE(s.next_order_number, 1000)
      INTO v_id, v_prefix, v_next
      FROM public.settings s
      ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC NULLS LAST
      LIMIT 1
      FOR UPDATE;

      IF v_id IS NOT NULL THEN
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

CREATE OR REPLACE FUNCTION public.generate_purchase_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order_no TEXT;
BEGIN
  v_order_no := public.generate_order_number();
  RETURN 'PO-' || v_order_no;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_centerize_id UUID;
  v_invoice_start TEXT := 'INV';
  v_invoice_no BIGINT;
  v_settings_id UUID;
  v_settings_next BIGINT;
BEGIN
  IF to_regclass('public.centerize_data') IS NOT NULL THEN
    BEGIN
      SELECT c.id,
             COALESCE(NULLIF(c.invoice_start, ''), 'INV'),
             COALESCE(c.invoice_no, 0)
      INTO v_centerize_id, v_invoice_start, v_invoice_no
      FROM public.centerize_data c
      ORDER BY c.id DESC
      LIMIT 1
      FOR UPDATE;

      IF v_centerize_id IS NOT NULL THEN
        v_invoice_no := v_invoice_no + 1;
        UPDATE public.centerize_data
        SET invoice_no = v_invoice_no
        WHERE id = v_centerize_id;

        RETURN v_invoice_start || '-' || TO_CHAR(NOW(), 'YYYY') || LPAD(v_invoice_no::TEXT, 6, '0');
      END IF;
    EXCEPTION
      WHEN undefined_column THEN
        NULL;
    END;
  END IF;

  IF to_regclass('public.settings') IS NOT NULL THEN
    BEGIN
      SELECT s.id,
             COALESCE(s.next_invoice_number, 1000)
      INTO v_settings_id, v_settings_next
      FROM public.settings s
      ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC NULLS LAST
      LIMIT 1
      FOR UPDATE;

      IF v_settings_id IS NOT NULL THEN
        UPDATE public.settings
        SET next_invoice_number = v_settings_next + 1
        WHERE id = v_settings_id;

        RETURN 'INV-' || TO_CHAR(NOW(), 'YYYY') || LPAD(v_settings_next::TEXT, 6, '0');
      END IF;
    EXCEPTION
      WHEN undefined_column THEN
        NULL;
    END;
  END IF;

  RETURN 'INV-' || TO_CHAR(NOW(), 'YYYYMMDDHH24MISSMS');
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants for pharmacy/admin authenticated flows
-- ---------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.validate_promo_code(VARCHAR, UUID, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_order_number() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_purchase_order_number() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_invoice_number() TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'Phase 3j pharmacy RPC function fixes applied successfully.';
END $$;

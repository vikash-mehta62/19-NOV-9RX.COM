-- Atomic credit line adjustment for admin order item edits
-- Ensures credit invoice creation + synchronized balances across profiles and user_credit_lines.

CREATE OR REPLACE FUNCTION public.apply_credit_line_order_adjustment(
  p_order_id UUID,
  p_customer_id UUID,
  p_adjustment_amount NUMERIC(12,2),
  p_original_amount NUMERIC(12,2),
  p_new_amount NUMERIC(12,2),
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_is_admin BOOLEAN := false;

  v_order public.orders%ROWTYPE;
  v_invoice public.invoices%ROWTYPE;
  v_customer_id UUID;

  v_profile_limit NUMERIC(12,2) := 0;
  v_profile_used NUMERIC(12,2) := 0;
  v_profile_available NUMERIC(12,2) := 0;

  v_has_credit_line BOOLEAN := false;
  v_ucl_limit NUMERIC(12,2) := 0;
  v_ucl_used NUMERIC(12,2) := 0;
  v_ucl_available NUMERIC(12,2) := 0;
  v_ucl_net_terms INTEGER := 30;

  v_credit_invoice_id UUID;
  v_credit_invoice_number TEXT;
  v_credit_due_date DATE;

  v_adjustment_id UUID;
  v_adjustment_number TEXT;

  v_amount NUMERIC(12,2);
  v_reason TEXT;
  v_attempt INTEGER;
BEGIN
  IF p_order_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'status', 'invalid_input', 'message', 'order_id is required');
  END IF;

  IF p_customer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'status', 'invalid_input', 'message', 'customer_id is required');
  END IF;

  v_amount := ROUND(COALESCE(p_adjustment_amount, 0), 2);
  IF v_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'status', 'invalid_input', 'message', 'adjustment amount must be greater than 0');
  END IF;

  IF v_actor_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = v_actor_id
        AND (p.role IN ('admin', 'superadmin') OR p.type::TEXT = 'admin')
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
      RETURN jsonb_build_object('success', false, 'status', 'forbidden', 'message', 'Only admins can apply credit line adjustments');
    END IF;
  END IF;

  SELECT *
  INTO v_order
  FROM public.orders o
  WHERE o.id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'status', 'not_found', 'message', 'Order not found');
  END IF;

  v_customer_id := COALESCE(v_order.profile_id, p_customer_id);
  IF v_customer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'status', 'invalid_order', 'message', 'Order has no customer profile');
  END IF;

  IF p_customer_id <> v_customer_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 'customer_mismatch',
      'message', 'Provided customer_id does not match order profile_id'
    );
  END IF;

  SELECT *
  INTO v_invoice
  FROM public.invoices i
  WHERE i.order_id = v_order.id
  ORDER BY i.created_at DESC NULLS LAST
  LIMIT 1
  FOR UPDATE;

  SELECT
    COALESCE(NULLIF(p.credit_limit::TEXT, '')::NUMERIC, 0),
    COALESCE(NULLIF(p.credit_used::TEXT, '')::NUMERIC, 0)
  INTO v_profile_limit, v_profile_used
  FROM public.profiles p
  WHERE p.id = v_customer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'status', 'not_found', 'message', 'Customer profile not found');
  END IF;

  SELECT
    COALESCE(ucl.credit_limit, 0),
    COALESCE(ucl.used_credit, 0),
    GREATEST(COALESCE(ucl.net_terms, 30), 1)
  INTO v_ucl_limit, v_ucl_used, v_ucl_net_terms
  FROM public.user_credit_lines ucl
  WHERE ucl.user_id = v_customer_id
  FOR UPDATE;

  v_has_credit_line := FOUND;

  IF v_has_credit_line THEN
    v_ucl_available := GREATEST(0, v_ucl_limit - v_ucl_used);
  END IF;

  v_profile_available := GREATEST(0, v_profile_limit - v_profile_used);

  IF v_has_credit_line THEN
    IF v_ucl_available < v_amount THEN
      RETURN jsonb_build_object(
        'success', false,
        'status', 'credit_limit_exceeded',
        'message', 'Insufficient available credit',
        'available_credit', v_ucl_available,
        'required_amount', v_amount
      );
    END IF;
  ELSE
    IF v_profile_available < v_amount THEN
      RETURN jsonb_build_object(
        'success', false,
        'status', 'credit_limit_exceeded',
        'message', 'Insufficient available credit',
        'available_credit', v_profile_available,
        'required_amount', v_amount
      );
    END IF;
  END IF;

  v_profile_used := ROUND(v_profile_used + v_amount, 2);
  v_profile_available := GREATEST(0, ROUND(v_profile_limit - v_profile_used, 2));

  UPDATE public.profiles p
  SET credit_used = v_profile_used,
      available_credit = v_profile_available,
      updated_at = NOW()
  WHERE p.id = v_customer_id;

  IF v_has_credit_line THEN
    v_ucl_used := ROUND(v_ucl_used + v_amount, 2);
    v_ucl_available := GREATEST(0, ROUND(v_ucl_limit - v_ucl_used, 2));

    UPDATE public.user_credit_lines ucl
    SET used_credit = v_ucl_used,
        available_credit = v_ucl_available,
        updated_at = NOW()
    WHERE ucl.user_id = v_customer_id;
  END IF;

  v_credit_due_date := CURRENT_DATE + v_ucl_net_terms;

  FOR v_attempt IN 1..5 LOOP
    v_credit_invoice_number := 'CR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

    BEGIN
      INSERT INTO public.credit_invoices (
        invoice_number,
        user_id,
        order_id,
        original_amount,
        penalty_amount,
        total_amount,
        paid_amount,
        balance_due,
        invoice_date,
        due_date,
        status,
        notes,
        created_at,
        updated_at
      ) VALUES (
        v_credit_invoice_number,
        v_customer_id,
        v_order.id,
        v_amount,
        0,
        v_amount,
        0,
        v_amount,
        CURRENT_DATE,
        v_credit_due_date,
        'pending',
        COALESCE(p_reason, 'Created from admin order amount adjustment paid via credit line'),
        NOW(),
        NOW()
      ) RETURNING id INTO v_credit_invoice_id;

      EXIT;
    EXCEPTION
      WHEN unique_violation THEN
        IF v_attempt = 5 THEN
          RAISE;
        END IF;
    END;
  END LOOP;

  v_adjustment_number := public.generate_adjustment_number();
  v_reason := COALESCE(p_reason, 'Order modified - charged to credit line');

  INSERT INTO public.payment_adjustments (
    adjustment_number,
    order_id,
    customer_id,
    adjustment_type,
    original_amount,
    new_amount,
    difference_amount,
    payment_method,
    payment_status,
    reason,
    processed_by,
    processed_at,
    metadata
  ) VALUES (
    v_adjustment_number,
    v_order.id,
    v_customer_id,
    'additional_payment',
    ROUND(COALESCE(p_original_amount, 0), 2),
    ROUND(COALESCE(p_new_amount, 0), 2),
    v_amount,
    'credit',
    'completed',
    v_reason,
    COALESCE(v_actor_id, v_customer_id),
    NOW(),
    jsonb_build_object(
      'credit_invoice_id', v_credit_invoice_id,
      'credit_invoice_number', v_credit_invoice_number,
      'source', 'admin_order_adjustment'
    )
  ) RETURNING id INTO v_adjustment_id;

  INSERT INTO public.account_transactions (
    customer_id,
    transaction_date,
    transaction_type,
    reference_type,
    reference_id,
    description,
    debit_amount,
    credit_amount,
    balance,
    created_by
  ) VALUES (
    v_customer_id,
    NOW(),
    'debit',
    'order',
    v_order.id,
    'Credit line charge for order adjustment ' || COALESCE(v_order.order_number, ''),
    v_amount,
    0,
    CASE
      WHEN v_has_credit_line THEN v_ucl_available
      ELSE v_profile_available
    END,
    COALESCE(v_actor_id, v_customer_id)
  );

  UPDATE public.orders o
  SET payment_status = 'paid',
      paid_amount = ROUND(COALESCE(p_new_amount, COALESCE(NULLIF(o.paid_amount::TEXT, '')::NUMERIC, 0) + v_amount), 2),
      updated_at = NOW()
  WHERE o.id = v_order.id;

  IF v_invoice.id IS NOT NULL THEN
    UPDATE public.invoices i
    SET payment_status = 'paid',
        paid_amount = ROUND(COALESCE(p_new_amount, COALESCE(i.paid_amount, 0) + v_amount), 2),
        updated_at = NOW()
    WHERE i.id = v_invoice.id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'completed',
    'message', 'Credit line adjustment applied successfully',
    'order_id', v_order.id,
    'customer_id', v_customer_id,
    'adjustment_amount', v_amount,
    'credit_invoice_id', v_credit_invoice_id,
    'credit_invoice_number', v_credit_invoice_number,
    'payment_adjustment_id', v_adjustment_id,
    'payment_adjustment_number', v_adjustment_number,
    'credit_used', v_profile_used,
    'available_credit', CASE
      WHEN v_has_credit_line THEN v_ucl_available
      ELSE v_profile_available
    END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_credit_line_order_adjustment(UUID, UUID, NUMERIC, NUMERIC, NUMERIC, TEXT) TO authenticated;

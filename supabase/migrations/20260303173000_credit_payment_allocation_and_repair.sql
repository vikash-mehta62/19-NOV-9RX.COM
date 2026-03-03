-- Credit payment allocation + balance repair
-- Purpose:
-- 1) Prevent overpayments on a single credit invoice.
-- 2) Support deterministic allocation for full payments across multiple invoices.
-- 3) Keep profile/user_credit_lines balances in sync with invoice balances.

CREATE OR REPLACE FUNCTION public.process_credit_payment_allocated(
  p_user_id UUID,
  p_amount NUMERIC(12,2),
  p_payment_method VARCHAR(50),
  p_transaction_id VARCHAR(100) DEFAULT NULL,
  p_payment_mode VARCHAR(20) DEFAULT 'full',
  p_target_invoice_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_is_admin BOOLEAN := false;
  v_mode TEXT := lower(COALESCE(p_payment_mode, 'full'));
  v_remaining NUMERIC(12,2);
  v_amount_to_apply NUMERIC(12,2);
  v_total_open NUMERIC(12,2) := 0;
  v_outstanding_after NUMERIC(12,2) := 0;
  v_alloc_amount NUMERIC(12,2);
  v_paid_penalty NUMERIC(12,2);
  v_penalty_component NUMERIC(12,2);
  v_principal_component NUMERIC(12,2);
  v_new_balance NUMERIC(12,2);
  v_new_status TEXT;
  v_payment_id UUID;
  v_last_payment_id UUID;
  v_alloc_count INTEGER := 0;
  v_allocations JSONB := '[]'::JSONB;
  v_invoice RECORD;
  v_ucl_limit NUMERIC(12,2) := 0;
  v_profile_limit NUMERIC(12,2) := 0;
  v_used_credit NUMERIC(12,2) := 0;
  v_available_credit NUMERIC(12,2) := 0;
  v_target_exists BOOLEAN := false;
  v_target_balance NUMERIC(12,2) := 0;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'user_id is required');
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Payment amount must be greater than 0');
  END IF;

  IF v_mode NOT IN ('full', 'partial') THEN
    RETURN jsonb_build_object('success', false, 'message', 'payment_mode must be full or partial');
  END IF;

  IF v_actor_id IS NOT NULL AND v_actor_id <> p_user_id THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = v_actor_id
        AND (p.role IN ('admin', 'superadmin') OR p.type::TEXT = 'admin')
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
      RETURN jsonb_build_object('success', false, 'status', 'forbidden', 'message', 'Not allowed to process this payment');
    END IF;
  END IF;

  IF v_mode = 'partial' THEN
    IF p_target_invoice_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'message', 'target_invoice_id is required for partial payments');
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM public.credit_invoices ci
      WHERE ci.id = p_target_invoice_id
        AND ci.user_id = p_user_id
        AND ci.status IN ('pending', 'partial', 'overdue')
        AND COALESCE(ci.balance_due, 0) > 0
    ) INTO v_target_exists;

    IF NOT v_target_exists THEN
      RETURN jsonb_build_object('success', false, 'message', 'Selected invoice is not payable');
    END IF;

    SELECT COALESCE(ci.balance_due, 0)::NUMERIC(12,2)
    INTO v_target_balance
    FROM public.credit_invoices ci
    WHERE ci.id = p_target_invoice_id
      AND ci.user_id = p_user_id;

    IF p_amount > v_target_balance THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Partial amount cannot exceed selected invoice balance',
        'max_amount', v_target_balance
      );
    END IF;
  END IF;

  SELECT COALESCE(SUM(COALESCE(ci.balance_due, 0)), 0)::NUMERIC(12,2)
  INTO v_total_open
  FROM public.credit_invoices ci
  WHERE ci.user_id = p_user_id
    AND ci.status IN ('pending', 'partial', 'overdue')
    AND COALESCE(ci.balance_due, 0) > 0;

  IF v_total_open <= 0 THEN
    RETURN jsonb_build_object('success', false, 'status', 'no_outstanding', 'message', 'No outstanding credit invoices');
  END IF;

  IF p_amount > v_total_open THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Payment amount exceeds outstanding balance',
      'outstanding_balance', v_total_open
    );
  END IF;

  v_amount_to_apply := p_amount;
  v_remaining := v_amount_to_apply;

  FOR v_invoice IN
    SELECT ci.*
    FROM public.credit_invoices ci
    WHERE ci.user_id = p_user_id
      AND ci.status IN ('pending', 'partial', 'overdue')
      AND COALESCE(ci.balance_due, 0) > 0
      AND (v_mode <> 'partial' OR ci.id = p_target_invoice_id)
    ORDER BY ci.due_date ASC NULLS LAST, ci.invoice_date ASC NULLS LAST, ci.created_at ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining <= 0;

    v_alloc_amount := LEAST(v_remaining, COALESCE(v_invoice.balance_due, 0)::NUMERIC(12,2));
    IF v_alloc_amount <= 0 THEN
      CONTINUE;
    END IF;

    SELECT COALESCE(SUM(COALESCE(cp.penalty_amount, 0)), 0)::NUMERIC(12,2)
    INTO v_paid_penalty
    FROM public.credit_payments cp
    WHERE cp.credit_invoice_id = v_invoice.id
      AND cp.status = 'completed';

    v_penalty_component := GREATEST(
      LEAST(v_alloc_amount, GREATEST(COALESCE(v_invoice.penalty_amount, 0)::NUMERIC(12,2) - v_paid_penalty, 0)),
      0
    );
    v_principal_component := v_alloc_amount - v_penalty_component;

    INSERT INTO public.credit_payments (
      credit_invoice_id,
      user_id,
      amount,
      payment_method,
      transaction_id,
      principal_amount,
      penalty_amount,
      status,
      notes,
      created_at
    ) VALUES (
      v_invoice.id,
      p_user_id,
      v_alloc_amount,
      COALESCE(NULLIF(p_payment_method, ''), 'manual'),
      COALESCE(NULLIF(p_transaction_id, ''), 'TXN-' || EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT),
      v_principal_component,
      v_penalty_component,
      'completed',
      COALESCE(p_notes, 'Credit payment allocation (' || v_mode || ')'),
      NOW()
    ) RETURNING id INTO v_payment_id;

    v_last_payment_id := v_payment_id;

    v_new_balance := ROUND(GREATEST(COALESCE(v_invoice.balance_due, 0)::NUMERIC(12,2) - v_alloc_amount, 0), 2);

    IF v_new_balance <= 0 THEN
      v_new_status := 'paid';
      v_new_balance := 0;
    ELSIF COALESCE(v_invoice.due_date, CURRENT_DATE) < CURRENT_DATE THEN
      v_new_status := 'overdue';
    ELSE
      v_new_status := 'partial';
    END IF;

    UPDATE public.credit_invoices ci
    SET paid_amount = LEAST(COALESCE(ci.total_amount, 0), COALESCE(ci.paid_amount, 0) + v_alloc_amount),
        balance_due = v_new_balance,
        status = v_new_status,
        paid_date = CASE WHEN v_new_status = 'paid' THEN COALESCE(ci.paid_date, CURRENT_DATE) ELSE ci.paid_date END,
        updated_at = NOW()
    WHERE ci.id = v_invoice.id;

    v_alloc_count := v_alloc_count + 1;
    v_allocations := v_allocations || jsonb_build_array(
      jsonb_build_object(
        'invoice_id', v_invoice.id,
        'invoice_number', v_invoice.invoice_number,
        'allocated_amount', v_alloc_amount,
        'new_balance_due', v_new_balance,
        'invoice_status', v_new_status,
        'payment_id', v_payment_id
      )
    );

    v_remaining := ROUND(v_remaining - v_alloc_amount, 2);
  END LOOP;

  IF v_alloc_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'No invoice allocation was applied');
  END IF;

  IF v_remaining > 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Payment allocation incomplete', 'remaining_unapplied', v_remaining);
  END IF;

  SELECT COALESCE(SUM(COALESCE(ci.balance_due, 0)), 0)::NUMERIC(12,2)
  INTO v_used_credit
  FROM public.credit_invoices ci
  WHERE ci.user_id = p_user_id
    AND ci.status IN ('pending', 'partial', 'overdue')
    AND COALESCE(ci.balance_due, 0) > 0;

  SELECT COALESCE(ucl.credit_limit, 0)::NUMERIC(12,2)
  INTO v_ucl_limit
  FROM public.user_credit_lines ucl
  WHERE ucl.user_id = p_user_id
  FOR UPDATE;

  IF FOUND THEN
    v_available_credit := GREATEST(0, v_ucl_limit - v_used_credit);
    UPDATE public.user_credit_lines ucl
    SET used_credit = v_used_credit,
        available_credit = v_available_credit,
        last_payment_date = NOW(),
        updated_at = NOW()
    WHERE ucl.user_id = p_user_id;
  END IF;

  SELECT COALESCE(NULLIF(p.credit_limit::TEXT, '')::NUMERIC, 0)
  INTO v_profile_limit
  FROM public.profiles p
  WHERE p.id = p_user_id
  FOR UPDATE;

  IF FOUND THEN
    v_available_credit := GREATEST(0, v_profile_limit - v_used_credit);

    UPDATE public.profiles p
    SET credit_used = v_used_credit,
        available_credit = v_available_credit,
        updated_at = NOW()
    WHERE p.id = p_user_id;
  END IF;

  SELECT COALESCE(SUM(COALESCE(ci.balance_due, 0)), 0)::NUMERIC(12,2)
  INTO v_outstanding_after
  FROM public.credit_invoices ci
  WHERE ci.user_id = p_user_id
    AND ci.status IN ('pending', 'partial', 'overdue')
    AND COALESCE(ci.balance_due, 0) > 0;

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
    p_user_id,
    NOW(),
    'credit',
    'payment',
    p_target_invoice_id,
    CASE WHEN v_mode = 'partial' THEN 'Credit payment applied to selected invoice' ELSE 'Credit payment auto-allocated across invoices' END,
    0,
    v_amount_to_apply,
    v_available_credit,
    COALESCE(v_actor_id, p_user_id)
  );

  RETURN jsonb_build_object(
    'success', true,
    'status', 'completed',
    'payment_mode', v_mode,
    'applied_amount', v_amount_to_apply,
    'allocation_count', v_alloc_count,
    'allocations', v_allocations,
    'remaining_outstanding', v_outstanding_after,
    'used_credit', v_used_credit,
    'available_credit', v_available_credit,
    'last_payment_id', v_last_payment_id
  );
END;
$$;

-- Backward-compatible wrapper for existing callers.
CREATE OR REPLACE FUNCTION public.process_credit_payment(
  p_invoice_id UUID,
  p_amount DECIMAL(12,2),
  p_payment_method VARCHAR(50),
  p_transaction_id VARCHAR(100)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_result JSONB;
  v_first_alloc JSONB;
BEGIN
  SELECT ci.user_id
  INTO v_user_id
  FROM public.credit_invoices ci
  WHERE ci.id = p_invoice_id;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invoice not found');
  END IF;

  SELECT public.process_credit_payment_allocated(
    p_user_id => v_user_id,
    p_amount => p_amount,
    p_payment_method => p_payment_method,
    p_transaction_id => p_transaction_id,
    p_payment_mode => 'partial',
    p_target_invoice_id => p_invoice_id,
    p_notes => 'Processed via legacy process_credit_payment wrapper'
  )
  INTO v_result;

  IF NOT COALESCE((v_result->>'success')::BOOLEAN, false) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', COALESCE(v_result->>'message', 'Payment processing failed')
    );
  END IF;

  v_first_alloc := COALESCE(v_result->'allocations'->0, '{}'::JSONB);

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_result->>'last_payment_id',
    'new_balance', COALESCE((v_first_alloc->>'new_balance_due')::NUMERIC, 0),
    'status', COALESCE(v_first_alloc->>'invoice_status', 'partial')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.repair_credit_payment_balances(p_user_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_is_admin BOOLEAN := false;
  v_invoice_count INTEGER := 0;
  v_user_count INTEGER := 0;
  v_user UUID;
  v_open_balance NUMERIC(12,2);
  v_ucl_limit NUMERIC(12,2);
  v_profile_limit NUMERIC(12,2);
BEGIN
  IF v_actor_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = v_actor_id
        AND (p.role IN ('admin', 'superadmin') OR p.type::TEXT = 'admin')
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
      RETURN jsonb_build_object('success', false, 'status', 'forbidden', 'message', 'Only admins can run repair');
    END IF;
  END IF;

  UPDATE public.credit_invoices ci
  SET paid_amount = LEAST(COALESCE(ci.total_amount, 0), COALESCE(pt.paid_amount, 0)),
      balance_due = ROUND(GREATEST(COALESCE(ci.total_amount, 0) - LEAST(COALESCE(ci.total_amount, 0), COALESCE(pt.paid_amount, 0)), 0), 2),
      status = CASE
                 WHEN ROUND(GREATEST(COALESCE(ci.total_amount, 0) - LEAST(COALESCE(ci.total_amount, 0), COALESCE(pt.paid_amount, 0)), 0), 2) = 0 THEN 'paid'
                 WHEN COALESCE(ci.due_date, CURRENT_DATE) < CURRENT_DATE THEN 'overdue'
                 WHEN COALESCE(pt.paid_amount, 0) > 0 THEN 'partial'
                 ELSE 'pending'
               END,
      paid_date = CASE
                    WHEN ROUND(GREATEST(COALESCE(ci.total_amount, 0) - LEAST(COALESCE(ci.total_amount, 0), COALESCE(pt.paid_amount, 0)), 0), 2) = 0
                      THEN COALESCE(ci.paid_date, CURRENT_DATE)
                    ELSE ci.paid_date
                  END,
      updated_at = NOW()
  FROM (
    SELECT i.id,
           COALESCE(SUM(CASE WHEN cp.status = 'completed' THEN COALESCE(cp.amount, 0) ELSE 0 END), 0)::NUMERIC(12,2) AS paid_amount
    FROM public.credit_invoices i
    LEFT JOIN public.credit_payments cp ON cp.credit_invoice_id = i.id
    WHERE p_user_id IS NULL OR i.user_id = p_user_id
    GROUP BY i.id
  ) pt
  WHERE ci.id = pt.id;

  GET DIAGNOSTICS v_invoice_count = ROW_COUNT;

  FOR v_user IN
    SELECT DISTINCT ci.user_id
    FROM public.credit_invoices ci
    WHERE p_user_id IS NULL OR ci.user_id = p_user_id
  LOOP
    v_user_count := v_user_count + 1;

    SELECT COALESCE(SUM(COALESCE(ci.balance_due, 0)), 0)::NUMERIC(12,2)
    INTO v_open_balance
    FROM public.credit_invoices ci
    WHERE ci.user_id = v_user
      AND ci.status IN ('pending', 'partial', 'overdue')
      AND COALESCE(ci.balance_due, 0) > 0;

    SELECT COALESCE(ucl.credit_limit, 0)::NUMERIC(12,2)
    INTO v_ucl_limit
    FROM public.user_credit_lines ucl
    WHERE ucl.user_id = v_user;

    IF FOUND THEN
      UPDATE public.user_credit_lines ucl
      SET used_credit = v_open_balance,
          available_credit = GREATEST(0, v_ucl_limit - v_open_balance),
          updated_at = NOW()
      WHERE ucl.user_id = v_user;
    END IF;

    SELECT COALESCE(NULLIF(p.credit_limit::TEXT, '')::NUMERIC, 0)
    INTO v_profile_limit
    FROM public.profiles p
    WHERE p.id = v_user;

    IF FOUND THEN
      UPDATE public.profiles p
      SET credit_used = v_open_balance,
          available_credit = GREATEST(0, v_profile_limit - v_open_balance),
          updated_at = NOW()
      WHERE p.id = v_user;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'completed',
    'invoices_reconciled', v_invoice_count,
    'users_synced', v_user_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_credit_payment_allocated(UUID, NUMERIC, VARCHAR, VARCHAR, VARCHAR, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_credit_payment(UUID, DECIMAL, VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.repair_credit_payment_balances(UUID) TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'Credit payment allocation and repair migration applied successfully.';
END $$;

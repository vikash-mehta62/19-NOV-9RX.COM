-- =====================================================
-- ALLOW AUTOMATIC ALLOCATION FOR PARTIAL PAYMENTS
-- =====================================================
-- Purpose: Allow partial payments without target_invoice_id
-- so that payment automatically allocates to penalty first,
-- then to credit invoices
-- =====================================================

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
  v_profile_penalty NUMERIC(12,2) := 0;
  v_penalty_paid NUMERIC(12,2) := 0;
BEGIN
  -- Validation
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'user_id is required');
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Payment amount must be greater than 0');
  END IF;

  IF v_mode NOT IN ('full', 'partial') THEN
    RETURN jsonb_build_object('success', false, 'message', 'payment_mode must be full or partial');
  END IF;

  -- Admin check
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

  -- MODIFIED: For partial payment with target_invoice_id, validate it
  IF v_mode = 'partial' AND p_target_invoice_id IS NOT NULL THEN
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

  -- Get total outstanding (including penalty from profiles)
  SELECT 
    COALESCE(SUM(COALESCE(ci.balance_due, 0)), 0)::NUMERIC(12,2),
    COALESCE(MAX(p.credit_penalty), 0)::NUMERIC(12,2)
  INTO v_total_open, v_profile_penalty
  FROM public.credit_invoices ci
  CROSS JOIN public.profiles p
  WHERE ci.user_id = p_user_id
    AND p.id = p_user_id
    AND ci.status IN ('pending', 'partial', 'overdue')
    AND COALESCE(ci.balance_due, 0) > 0;

  v_total_open := v_total_open + v_profile_penalty;

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

  -- STEP 1: Apply to profile penalty first (if exists and no specific target)
  IF v_profile_penalty > 0 AND v_remaining > 0 AND (v_mode = 'full' OR p_target_invoice_id IS NULL) THEN
    v_penalty_paid := LEAST(v_remaining, v_profile_penalty);
    
    UPDATE public.profiles
    SET 
      credit_penalty = GREATEST(0, credit_penalty - v_penalty_paid),
      updated_at = NOW()
    WHERE id = p_user_id;
    
    v_remaining := v_remaining - v_penalty_paid;
    
    RAISE NOTICE 'Applied $% to profile penalty (remaining: $%)', v_penalty_paid, v_remaining;
  END IF;

  -- STEP 2: Apply remaining to invoices
  FOR v_invoice IN
    SELECT ci.*
    FROM public.credit_invoices ci
    WHERE ci.user_id = p_user_id
      AND ci.status IN ('pending', 'partial', 'overdue')
      AND COALESCE(ci.balance_due, 0) > 0
      AND (p_target_invoice_id IS NULL OR ci.id = p_target_invoice_id)
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
      0,
      LEAST(
        v_alloc_amount,
        COALESCE(v_invoice.penalty_amount, 0)::NUMERIC(12,2) - v_paid_penalty
      )
    );

    v_principal_component := v_alloc_amount - v_penalty_component;

    INSERT INTO public.credit_payments (
      user_id,
      credit_invoice_id,
      amount,
      penalty_amount,
      principal_amount,
      payment_method,
      transaction_id,
      status,
      notes,
      created_at
    ) VALUES (
      p_user_id,
      v_invoice.id,
      v_alloc_amount,
      v_penalty_component,
      v_principal_component,
      p_payment_method,
      p_transaction_id,
      'completed',
      p_notes,
      NOW()
    ) RETURNING id INTO v_payment_id;

    v_last_payment_id := v_payment_id;

    v_new_balance := GREATEST(0, COALESCE(v_invoice.balance_due, 0)::NUMERIC(12,2) - v_alloc_amount);

    IF v_new_balance <= 0 THEN
      v_new_status := 'paid';
    ELSIF v_new_balance < COALESCE(v_invoice.original_amount, 0)::NUMERIC(12,2) THEN
      v_new_status := 'partial';
    ELSE
      v_new_status := v_invoice.status;
    END IF;

    UPDATE public.credit_invoices ci
    SET
      paid_amount = LEAST(COALESCE(ci.total_amount, 0), COALESCE(ci.paid_amount, 0) + v_alloc_amount),
      balance_due = v_new_balance,
      status = v_new_status,
      paid_date = CASE WHEN v_new_status = 'paid' THEN COALESCE(ci.paid_date, CURRENT_DATE) ELSE ci.paid_date END,
      updated_at = NOW()
    WHERE ci.id = v_invoice.id;

    v_allocations := v_allocations || jsonb_build_object(
      'invoice_id', v_invoice.id,
      'invoice_number', v_invoice.invoice_number,
      'amount', v_alloc_amount,
      'penalty', v_penalty_component,
      'principal', v_principal_component,
      'new_balance', v_new_balance,
      'new_status', v_new_status
    );

    v_alloc_count := v_alloc_count + 1;
    v_remaining := ROUND(v_remaining - v_alloc_amount, 2);
  END LOOP;

  -- Validation checks
  IF v_alloc_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'No invoice allocation was applied');
  END IF;

  IF v_remaining > 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Payment allocation incomplete', 'remaining_unapplied', v_remaining);
  END IF;

  -- Calculate used credit from invoices
  SELECT COALESCE(SUM(COALESCE(ci.balance_due, 0)), 0)::NUMERIC(12,2)
  INTO v_used_credit
  FROM public.credit_invoices ci
  WHERE ci.user_id = p_user_id
    AND ci.status IN ('pending', 'partial', 'overdue')
    AND COALESCE(ci.balance_due, 0) > 0;

  -- Update user_credit_lines
  SELECT COALESCE(ucl.credit_limit, 0)::NUMERIC(12,2)
  INTO v_ucl_limit
  FROM public.user_credit_lines ucl
  WHERE ucl.user_id = p_user_id
  FOR UPDATE;

  IF FOUND THEN
    v_available_credit := GREATEST(0, v_ucl_limit - v_used_credit);
    UPDATE public.user_credit_lines ucl
    SET
      used_credit = v_used_credit,
      available_credit = v_available_credit,
      last_payment_date = NOW(),
      payment_score = LEAST(100, payment_score + 2),
      updated_at = NOW()
    WHERE ucl.user_id = p_user_id;
  END IF;

  -- Update profiles
  SELECT COALESCE(NULLIF(p.credit_limit::TEXT, '')::NUMERIC, 0)
  INTO v_profile_limit
  FROM public.profiles p
  WHERE p.id = p_user_id
  FOR UPDATE;

  IF FOUND THEN
    v_available_credit := GREATEST(0, v_profile_limit - v_used_credit);
    UPDATE public.profiles p
    SET
      credit_used = v_used_credit,
      available_credit = v_available_credit,
      updated_at = NOW()
    WHERE p.id = p_user_id;
  END IF;

  -- If fully paid, clear penalty tracking
  SELECT COALESCE(SUM(COALESCE(ci.balance_due, 0)), 0)::NUMERIC(12,2)
  INTO v_outstanding_after
  FROM public.credit_invoices ci
  WHERE ci.user_id = p_user_id
    AND ci.status IN ('pending', 'partial', 'overdue')
    AND COALESCE(ci.balance_due, 0) > 0;

  IF v_outstanding_after = 0 THEN
    UPDATE public.profiles
    SET
      credit_penalty = 0,
      credit_usage_month = NULL,
      last_penalty_month = NULL,
      updated_at = NOW()
    WHERE id = p_user_id;
  END IF;

  -- Insert transaction record for credit history
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
    v_last_payment_id,
    CASE 
      WHEN v_penalty_paid > 0 AND v_alloc_count > 0 THEN 
        'Credit payment: $' || v_penalty_paid::TEXT || ' to penalty, $' || (v_amount_to_apply - v_penalty_paid)::TEXT || ' to invoices'
      WHEN v_penalty_paid > 0 THEN 
        'Credit payment: $' || v_penalty_paid::TEXT || ' to penalty'
      ELSE 
        'Credit payment auto-allocated across invoices'
    END,
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
    'penalty_paid', v_penalty_paid,
    'allocation_count', v_alloc_count,
    'allocations', v_allocations,
    'remaining_outstanding', v_outstanding_after,
    'used_credit', v_used_credit,
    'available_credit', v_available_credit,
    'last_payment_id', v_last_payment_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'message', 'Payment processing failed: ' || SQLERRM
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.process_credit_payment_allocated TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Updated process_credit_payment_allocated function';
  RAISE NOTICE '   - Partial payments can now pass NULL for target_invoice_id';
  RAISE NOTICE '   - Payment automatically applies to penalty first, then invoices';
  RAISE NOTICE '   - Maintains backward compatibility with targeted partial payments';
END $$;

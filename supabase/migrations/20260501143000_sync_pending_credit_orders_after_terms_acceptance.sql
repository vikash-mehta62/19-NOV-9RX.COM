-- Sync admin-created credit orders after a pharmacy accepts pending credit terms.
-- This is intentionally idempotent: existing order credit transactions/invoices are reused.

CREATE OR REPLACE FUNCTION public.sync_pending_credit_orders_after_terms_acceptance(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_auth_id UUID := auth.uid();
  v_is_admin BOOLEAN := FALSE;
  v_profile RECORD;
  v_credit_line RECORD;
  v_pending_terms RECORD;
  v_order RECORD;
  v_existing_tx_id UUID;
  v_existing_credit_invoice_id UUID;
  v_should_charge BOOLEAN;
  v_credit_limit NUMERIC := 0;
  v_credit_used NUMERIC := 0;
  v_order_total NUMERIC := 0;
  v_late_fee NUMERIC := 3;
  v_clean_value TEXT;
  v_profile_credit_days INTEGER := 30;
  v_net_terms INTEGER := 30;
  v_due_date DATE;
  v_invoice_number TEXT;
  v_attempt INTEGER;
  v_synced_count INTEGER := 0;
  v_skipped_count INTEGER := 0;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Missing user id');
  END IF;

  SELECT COALESCE(public.is_admin(v_auth_id), FALSE) INTO v_is_admin;

  IF v_auth_id IS NULL OR (v_auth_id <> p_user_id AND NOT v_is_admin) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  SELECT *
  INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  v_clean_value := NULLIF(REGEXP_REPLACE(COALESCE(v_profile.credit_limit::TEXT, ''), '[^0-9.-]', '', 'g'), '');
  v_credit_limit := CASE WHEN v_clean_value ~ '^-?[0-9]+(\.[0-9]+)?$' THEN v_clean_value::NUMERIC ELSE 0 END;
  v_clean_value := NULLIF(REGEXP_REPLACE(COALESCE(v_profile.credit_used::TEXT, ''), '[^0-9.-]', '', 'g'), '');
  v_credit_used := CASE WHEN v_clean_value ~ '^-?[0-9]+(\.[0-9]+)?$' THEN v_clean_value::NUMERIC ELSE 0 END;
  v_clean_value := NULLIF(REGEXP_REPLACE(COALESCE(v_profile.late_payment_fee_percentage::TEXT, ''), '[^0-9.-]', '', 'g'), '');
  v_late_fee := CASE WHEN v_clean_value ~ '^-?[0-9]+(\.[0-9]+)?$' THEN v_clean_value::NUMERIC ELSE 3 END;
  v_profile_credit_days := GREATEST(
    1,
    COALESCE(NULLIF(REGEXP_REPLACE(COALESCE(v_profile.credit_days::TEXT, ''), '[^0-9]', '', 'g'), '')::INTEGER, 30)
  );

  SELECT *
  INTO v_credit_line
  FROM public.user_credit_lines
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    v_clean_value := NULLIF(REGEXP_REPLACE(COALESCE(v_credit_line.credit_limit::TEXT, ''), '[^0-9.-]', '', 'g'), '');
    v_credit_limit := CASE WHEN v_clean_value ~ '^-?[0-9]+(\.[0-9]+)?$' THEN v_clean_value::NUMERIC ELSE v_credit_limit END;
    v_clean_value := NULLIF(REGEXP_REPLACE(COALESCE(v_credit_line.used_credit::TEXT, ''), '[^0-9.-]', '', 'g'), '');
    v_credit_used := CASE WHEN v_clean_value ~ '^-?[0-9]+(\.[0-9]+)?$' THEN v_clean_value::NUMERIC ELSE v_credit_used END;
    v_net_terms := GREATEST(
      1,
      COALESCE(NULLIF(REGEXP_REPLACE(COALESCE(v_credit_line.net_terms::TEXT, ''), '[^0-9]', '', 'g'), '')::INTEGER, v_profile_credit_days, 30)
    );
  ELSE
    v_net_terms := v_profile_credit_days;

    INSERT INTO public.user_credit_lines (
      user_id,
      credit_limit,
      available_credit,
      used_credit,
      net_terms,
      interest_rate,
      status,
      payment_score,
      created_at,
      updated_at
    )
    VALUES (
      p_user_id,
      v_credit_limit,
      GREATEST(0, v_credit_limit - v_credit_used),
      v_credit_used,
      v_net_terms,
      v_late_fee,
      'active',
      100,
      NOW(),
      NOW()
    )
    RETURNING * INTO v_credit_line;
  END IF;

  FOR v_order IN
    SELECT *
    FROM public.orders
    WHERE profile_id = p_user_id
      AND payment_method = 'credit'
      AND payment_status = 'pending'
      AND status = 'credit_approval_processing'
    ORDER BY created_at ASC
    FOR UPDATE
  LOOP
    v_clean_value := NULLIF(REGEXP_REPLACE(COALESCE(v_order.total_amount::TEXT, ''), '[^0-9.-]', '', 'g'), '');
    v_order_total := CASE WHEN v_clean_value ~ '^-?[0-9]+(\.[0-9]+)?$' THEN v_clean_value::NUMERIC ELSE 0 END;

    IF v_order_total <= 0 THEN
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;

    SELECT id
    INTO v_existing_tx_id
    FROM public.account_transactions
    WHERE customer_id = p_user_id
      AND reference_type = 'order'
      AND reference_id = v_order.id
      AND transaction_type = 'debit'
    LIMIT 1;

    SELECT id
    INTO v_existing_credit_invoice_id
    FROM public.credit_invoices
    WHERE order_id = v_order.id
    LIMIT 1;

    v_should_charge := v_existing_tx_id IS NULL AND v_existing_credit_invoice_id IS NULL;

    IF v_should_charge AND (v_credit_limit - v_credit_used) < v_order_total THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Insufficient credit available to sync all pending admin credit orders',
        'order_id', v_order.id,
        'available_credit', GREATEST(0, v_credit_limit - v_credit_used),
        'order_total', v_order_total,
        'synced_count', v_synced_count,
        'skipped_count', v_skipped_count
      );
    END IF;

    IF v_should_charge THEN
      v_credit_used := v_credit_used + v_order_total;
    END IF;

    IF v_existing_tx_id IS NULL THEN
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
      )
      VALUES (
        p_user_id,
        NOW(),
        'debit',
        'order',
        v_order.id,
        'Credit order synced after terms acceptance',
        v_order_total,
        0,
        GREATEST(0, v_credit_limit - v_credit_used),
        p_user_id
      );
    END IF;

    IF v_existing_credit_invoice_id IS NULL THEN
      v_due_date := CURRENT_DATE + v_net_terms;

      FOR v_attempt IN 1..5 LOOP
        v_invoice_number := 'CR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

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
          )
          VALUES (
            v_invoice_number,
            p_user_id,
            v_order.id,
            v_order_total,
            0,
            v_order_total,
            0,
            v_order_total,
            CURRENT_DATE,
            v_due_date,
            'pending',
            'Created after credit terms acceptance for admin-created pending credit order',
            NOW(),
            NOW()
          );

          EXIT;
        EXCEPTION
          WHEN unique_violation THEN
            IF v_attempt = 5 THEN
              RAISE;
            END IF;
        END;
      END LOOP;
    END IF;

    v_synced_count := v_synced_count + 1;
  END LOOP;

  UPDATE public.profiles
  SET credit_used = v_credit_used,
      available_credit = GREATEST(0, v_credit_limit - v_credit_used),
      updated_at = NOW()
  WHERE id = p_user_id;

  UPDATE public.user_credit_lines
  SET credit_limit = v_credit_limit,
      used_credit = v_credit_used,
      available_credit = GREATEST(0, v_credit_limit - v_credit_used),
      status = 'active',
      updated_at = NOW()
  WHERE id = v_credit_line.id;

  RETURN jsonb_build_object(
    'success', true,
    'synced_count', v_synced_count,
    'skipped_count', v_skipped_count,
    'credit_limit', v_credit_limit,
    'credit_used', v_credit_used,
    'available_credit', GREATEST(0, v_credit_limit - v_credit_used)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_pending_credit_orders_after_terms_acceptance(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.sync_pending_credit_order_after_terms_acceptance(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_auth_id UUID := auth.uid();
  v_is_admin BOOLEAN := FALSE;
  v_profile RECORD;
  v_credit_line RECORD;
  v_pending_terms RECORD;
  v_order RECORD;
  v_existing_tx_id UUID;
  v_existing_credit_invoice_id UUID;
  v_has_credit_line BOOLEAN := FALSE;
  v_credit_limit NUMERIC := 0;
  v_credit_used NUMERIC := 0;
  v_terms_credit_limit NUMERIC := 0;
  v_order_total NUMERIC := 0;
  v_clean_value TEXT;
  v_profile_credit_days INTEGER := 30;
  v_net_terms INTEGER := 30;
  v_due_date DATE;
  v_invoice_number TEXT;
  v_attempt INTEGER;
BEGIN
  IF p_order_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Missing order id');
  END IF;

  SELECT COALESCE(public.is_admin(v_auth_id), FALSE) INTO v_is_admin;

  IF v_auth_id IS NULL OR NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  SELECT *
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF COALESCE(v_order.payment_method, '') <> 'credit'
     OR COALESCE(v_order.payment_status, '') <> 'pending'
     OR COALESCE(v_order.status, '') <> 'credit_approval_processing' THEN
    RETURN jsonb_build_object('success', true, 'synced', false, 'reason', 'Order is not a pending credit approval order');
  END IF;

  SELECT *
  INTO v_profile
  FROM public.profiles
  WHERE id = v_order.profile_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  v_profile_credit_days := GREATEST(
    1,
    COALESCE(NULLIF(REGEXP_REPLACE(COALESCE(v_profile.credit_days::TEXT, ''), '[^0-9]', '', 'g'), '')::INTEGER, 30)
  );

  v_clean_value := NULLIF(REGEXP_REPLACE(COALESCE(v_order.total_amount::TEXT, ''), '[^0-9.-]', '', 'g'), '');
  v_order_total := CASE WHEN v_clean_value ~ '^-?[0-9]+(\.[0-9]+)?$' THEN v_clean_value::NUMERIC ELSE 0 END;

  v_clean_value := NULLIF(REGEXP_REPLACE(COALESCE(v_profile.credit_limit::TEXT, ''), '[^0-9.-]', '', 'g'), '');
  v_credit_limit := CASE WHEN v_clean_value ~ '^-?[0-9]+(\.[0-9]+)?$' THEN v_clean_value::NUMERIC ELSE 0 END;

  v_clean_value := NULLIF(REGEXP_REPLACE(COALESCE(v_profile.credit_used::TEXT, ''), '[^0-9.-]', '', 'g'), '');
  v_credit_used := CASE WHEN v_clean_value ~ '^-?[0-9]+(\.[0-9]+)?$' THEN v_clean_value::NUMERIC ELSE 0 END;

  SELECT *
  INTO v_credit_line
  FROM public.user_credit_lines
  WHERE user_id = v_order.profile_id
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  v_has_credit_line := FOUND;

  IF v_has_credit_line THEN
    v_clean_value := NULLIF(REGEXP_REPLACE(COALESCE(v_credit_line.credit_limit::TEXT, ''), '[^0-9.-]', '', 'g'), '');
    v_credit_limit := CASE WHEN v_clean_value ~ '^-?[0-9]+(\.[0-9]+)?$' THEN v_clean_value::NUMERIC ELSE v_credit_limit END;
    v_clean_value := NULLIF(REGEXP_REPLACE(COALESCE(v_credit_line.used_credit::TEXT, ''), '[^0-9.-]', '', 'g'), '');
    v_credit_used := CASE WHEN v_clean_value ~ '^-?[0-9]+(\.[0-9]+)?$' THEN v_clean_value::NUMERIC ELSE v_credit_used END;
    v_net_terms := GREATEST(
      1,
      COALESCE(NULLIF(REGEXP_REPLACE(COALESCE(v_credit_line.net_terms::TEXT, ''), '[^0-9]', '', 'g'), '')::INTEGER, v_profile_credit_days, 30)
    );
  ELSE
    v_net_terms := v_profile_credit_days;
  END IF;

  -- Admin-created credit orders may be approved before pharmacy acceptance.
  -- In that case, reserve against the latest live sent terms as provisional credit.
  SELECT *
  INTO v_pending_terms
  FROM public.sent_credit_terms
  WHERE user_id = v_order.profile_id
    AND status IN ('pending', 'viewed', 'accepted')
  ORDER BY
    CASE status
      WHEN 'viewed' THEN 0
      WHEN 'pending' THEN 1
      WHEN 'accepted' THEN 2
      ELSE 3
    END,
    sent_at DESC NULLS LAST,
    created_at DESC NULLS LAST
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    v_clean_value := NULLIF(REGEXP_REPLACE(COALESCE(v_pending_terms.credit_limit::TEXT, ''), '[^0-9.-]', '', 'g'), '');
    v_terms_credit_limit := CASE WHEN v_clean_value ~ '^-?[0-9]+(\.[0-9]+)?$' THEN v_clean_value::NUMERIC ELSE 0 END;

    IF v_terms_credit_limit > 0
       AND (
         NOT v_has_credit_line
         OR v_credit_limit <= 0
         OR v_pending_terms.status IN ('pending', 'viewed')
         OR v_terms_credit_limit > v_credit_limit
       ) THEN
      v_credit_limit := v_terms_credit_limit;
      v_net_terms := GREATEST(
        1,
        COALESCE(NULLIF(REGEXP_REPLACE(COALESCE(v_pending_terms.net_terms::TEXT, ''), '[^0-9]', '', 'g'), '')::INTEGER, v_net_terms, 30)
      );
    END IF;
  END IF;

  SELECT id
  INTO v_existing_tx_id
  FROM public.account_transactions
  WHERE customer_id = v_order.profile_id
    AND reference_type = 'order'
    AND reference_id = v_order.id
    AND transaction_type = 'debit'
  LIMIT 1;

  SELECT id
  INTO v_existing_credit_invoice_id
  FROM public.credit_invoices
  WHERE order_id = v_order.id
  LIMIT 1;

  IF v_existing_tx_id IS NOT NULL AND v_existing_credit_invoice_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'synced', false, 'reason', 'Already synced');
  END IF;

  IF v_existing_tx_id IS NULL AND v_existing_credit_invoice_id IS NULL THEN
    IF (v_credit_limit - v_credit_used) < v_order_total THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Available credit is less than order amount',
        'available_credit', GREATEST(0, v_credit_limit - v_credit_used),
        'order_amount', v_order_total
      );
    END IF;

    v_credit_used := v_credit_used + v_order_total;
  END IF;

  IF v_existing_tx_id IS NULL THEN
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
    )
    VALUES (
      v_order.profile_id,
      NOW(),
      'debit',
      'order',
      v_order.id,
      'Credit order synced before admin approval',
      v_order_total,
      0,
      GREATEST(0, v_credit_limit - v_credit_used),
      v_auth_id
    );
  END IF;

  IF v_existing_credit_invoice_id IS NULL THEN
    v_due_date := CURRENT_DATE + v_net_terms;

    FOR v_attempt IN 1..5 LOOP
      v_invoice_number := 'CR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

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
        )
        VALUES (
          v_invoice_number,
          v_order.profile_id,
          v_order.id,
          v_order_total,
          0,
          v_order_total,
          0,
          v_order_total,
          CURRENT_DATE,
          v_due_date,
          'pending',
          'Created before admin approval for accepted credit terms order',
          NOW(),
          NOW()
        );

        EXIT;
      EXCEPTION
        WHEN unique_violation THEN
          IF v_attempt = 5 THEN
            RAISE;
          END IF;
      END;
    END LOOP;
  END IF;

  UPDATE public.profiles
  SET credit_used = v_credit_used,
      available_credit = GREATEST(0, v_credit_limit - v_credit_used),
      updated_at = NOW()
  WHERE id = v_order.profile_id;

  IF v_has_credit_line THEN
    UPDATE public.user_credit_lines
    SET used_credit = v_credit_used,
        available_credit = GREATEST(0, v_credit_limit - v_credit_used),
        updated_at = NOW()
    WHERE id = v_credit_line.id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'synced', true,
    'order_id', v_order.id,
    'credit_used', v_credit_used,
    'available_credit', GREATEST(0, v_credit_limit - v_credit_used)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_pending_credit_order_after_terms_acceptance(UUID) TO authenticated;

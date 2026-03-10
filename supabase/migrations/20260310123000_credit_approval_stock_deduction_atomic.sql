-- Credit approval stock deduction:
-- - Deduct stock only at admin credit approval time (not at credit order creation).
-- - If batches exist for a size, deduct from batches and from product_sizes.stock (units).
-- - If no batches exist for a size, deduct only from product_sizes.stock (case qty fallback).
-- - Idempotent via order_activities metadata marker.

CREATE OR REPLACE FUNCTION public.approve_credit_order_atomic(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_invoice public.invoices%ROWTYPE;
  v_credit_invoice public.credit_invoices%ROWTYPE;
  v_invoice_number TEXT;
  v_credit_invoice_number TEXT;
  v_total_amount NUMERIC(12,2);
  v_tax_amount NUMERIC(12,2);
  v_discount_amount NUMERIC(12,2);
  v_subtotal NUMERIC(12,2);
  v_credit_limit NUMERIC(12,2);
  v_profile_credit_used NUMERIC(12,2);
  v_available_credit NUMERIC(12,2);
  v_due_date TIMESTAMPTZ;
  v_credit_due_date DATE;
  v_net_terms INTEGER := 30;
  v_ucl_credit_limit NUMERIC(12,2) := 0;
  v_ucl_used_credit NUMERIC(12,2) := 0;
  v_has_credit_line BOOLEAN := false;
  v_has_order_tx BOOLEAN := false;
  v_order_tx_id UUID;
  v_admin_id UUID := auth.uid();
  v_is_admin BOOLEAN := false;
  v_attempt INTEGER;
  v_created_invoice BOOLEAN := false;
  v_created_tx BOOLEAN := false;
  v_created_credit_invoice BOOLEAN := false;
  v_applied_credit_charge BOOLEAN := false;
  v_should_charge BOOLEAN := false;

  v_stock_marker_exists BOOLEAN := false;
  v_should_deduct_stock BOOLEAN := false;
  v_stock_deducted_now BOOLEAN := false;

  v_item JSONB;
  v_size JSONB;
  v_size_id UUID;
  v_case_qty NUMERIC(12,2);
  v_qty_per_case NUMERIC(12,2);
  v_requested_units NUMERIC(12,2);
  v_remaining_units NUMERIC(12,2);
  v_has_available_batches BOOLEAN;
  v_batch RECORD;
  v_stock_reduction RECORD;
  v_batch_current_qty NUMERIC(12,2);
  v_size_stock_current NUMERIC(12,2);
  v_allocate_qty NUMERIC(12,2);
BEGIN
  IF p_order_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 'error',
      'message', 'Order ID is required'
    );
  END IF;

  IF v_admin_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = v_admin_id
        AND (p.role IN ('admin', 'superadmin') OR p.type::TEXT = 'admin')
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
      RETURN jsonb_build_object(
        'success', false,
        'status', 'forbidden',
        'message', 'Only admins can approve credit orders'
      );
    END IF;
  END IF;

  SELECT *
  INTO v_order
  FROM public.orders o
  WHERE o.id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 'not_found',
      'message', 'Order not found'
    );
  END IF;

  IF v_order.profile_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 'invalid_order',
      'message', 'Order has no profile_id'
    );
  END IF;

  IF COALESCE(v_order.payment_method, '') <> 'credit' THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 'invalid_order',
      'message', 'Order payment_method is not credit'
    );
  END IF;

  IF COALESCE(v_order.status, '') NOT IN (
    'credit_approval_processing',
    'new',
    'processing',
    'confirmed',
    'shipped',
    'delivered',
    'completed'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 'invalid_status',
      'message', 'Order status is not eligible for credit approval'
    );
  END IF;

  SELECT *
  INTO v_profile
  FROM public.profiles p
  WHERE p.id = v_order.profile_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 'profile_not_found',
      'message', 'Profile not found for order'
    );
  END IF;

  v_total_amount := COALESCE(NULLIF(v_order.total_amount::TEXT, '')::NUMERIC, 0);
  v_tax_amount := COALESCE(NULLIF(v_order.tax_amount::TEXT, '')::NUMERIC, 0);
  v_discount_amount := COALESCE(NULLIF(v_order.discount_amount::TEXT, '')::NUMERIC, 0);
  v_subtotal := v_total_amount + v_discount_amount;

  IF v_total_amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 'invalid_amount',
      'message', 'Order total_amount must be greater than 0'
    );
  END IF;

  v_credit_limit := COALESCE(NULLIF(v_profile.credit_limit::TEXT, '')::NUMERIC, 0);
  v_profile_credit_used := COALESCE(NULLIF(v_profile.credit_used::TEXT, '')::NUMERIC, 0);

  SELECT *
  INTO v_invoice
  FROM public.invoices i
  WHERE i.order_id = v_order.id
  ORDER BY i.created_at DESC NULLS LAST
  LIMIT 1;

  SELECT at.id
  INTO v_order_tx_id
  FROM public.account_transactions at
  WHERE at.reference_id = v_order.id
    AND at.reference_type = 'order'
    AND at.transaction_type = 'debit'
  ORDER BY at.created_at DESC NULLS LAST
  LIMIT 1;

  v_has_order_tx := v_order_tx_id IS NOT NULL;

  SELECT *
  INTO v_credit_invoice
  FROM public.credit_invoices ci
  WHERE ci.order_id = v_order.id
  ORDER BY ci.created_at DESC NULLS LAST
  LIMIT 1;

  SELECT EXISTS (
    SELECT 1
    FROM public.order_activities oa
    WHERE oa.order_id = v_order.id
      AND oa.activity_type = 'updated'
      AND COALESCE(oa.metadata, '{}'::jsonb) @> '{"stock_deducted_after_credit_approval": true, "source": "credit_approval_rpc"}'::jsonb
  ) INTO v_stock_marker_exists;

  v_should_deduct_stock := COALESCE(v_order.status, '') = 'credit_approval_processing'
                           AND NOT v_stock_marker_exists;

  IF v_invoice.id IS NOT NULL
     AND v_has_order_tx
     AND v_credit_invoice.id IS NOT NULL
     AND COALESCE(v_order.payment_status, '') = 'paid'
     AND COALESCE(v_order.status, '') <> 'credit_approval_processing'
     AND v_stock_marker_exists THEN
    RETURN jsonb_build_object(
      'success', true,
      'status', 'already_processed',
      'message', 'Credit order is already approved and processed',
      'order_id', v_order.id,
      'order_status', v_order.status,
      'invoice_id', v_invoice.id,
      'invoice_number', v_invoice.invoice_number,
      'credit_invoice_id', v_credit_invoice.id,
      'credit_invoice_number', v_credit_invoice.invoice_number,
      'stock_deducted', false,
      'stock_already_deducted', true
    );
  END IF;

  IF v_should_deduct_stock THEN
    CREATE TEMP TABLE IF NOT EXISTS tmp_credit_batch_allocations (
      size_id UUID NOT NULL,
      batch_id UUID NOT NULL,
      lot_number TEXT,
      quantity NUMERIC(12,2) NOT NULL
    ) ON COMMIT DROP;

    CREATE TEMP TABLE IF NOT EXISTS tmp_credit_stock_reduction (
      size_id UUID PRIMARY KEY,
      reduction_qty NUMERIC(12,2) NOT NULL DEFAULT 0
    ) ON COMMIT DROP;

    TRUNCATE TABLE tmp_credit_batch_allocations;
    TRUNCATE TABLE tmp_credit_stock_reduction;

    FOR v_item IN
      SELECT value
      FROM jsonb_array_elements(COALESCE(to_jsonb(v_order.items), '[]'::jsonb))
    LOOP
      FOR v_size IN
        SELECT value
        FROM jsonb_array_elements(COALESCE(v_item->'sizes', '[]'::jsonb))
      LOOP
        v_size_id := NULL;
        BEGIN
          IF NULLIF(v_size->>'id', '') IS NOT NULL THEN
            v_size_id := (v_size->>'id')::UUID;
          END IF;
        EXCEPTION
          WHEN invalid_text_representation THEN
            RAISE EXCEPTION 'Invalid size id in order %: %', v_order.id, v_size->>'id';
        END;

        IF v_size_id IS NULL THEN
          CONTINUE;
        END IF;

        v_case_qty := COALESCE(NULLIF(v_size->>'quantity', '')::NUMERIC, 0);
        IF v_case_qty <= 0 THEN
          CONTINUE;
        END IF;

        v_qty_per_case := GREATEST(1, COALESCE(NULLIF(v_size->>'quantity_per_case', '')::NUMERIC, 1));
        v_requested_units := v_case_qty * v_qty_per_case;
        v_remaining_units := v_requested_units;
        v_has_available_batches := false;

        FOR v_batch IN
          SELECT pb.id, pb.lot_number, COALESCE(pb.quantity_available, 0)::NUMERIC AS quantity_available
          FROM public.product_batches pb
          WHERE pb.product_size_id = v_size_id
            AND pb.status = 'active'
            AND COALESCE(pb.quantity_available, 0) > 0
          ORDER BY pb.expiry_date ASC NULLS LAST, pb.received_date ASC
          FOR UPDATE
        LOOP
          v_has_available_batches := true;
          EXIT WHEN v_remaining_units <= 0;

          v_allocate_qty := LEAST(v_remaining_units, v_batch.quantity_available);
          IF v_allocate_qty <= 0 THEN
            CONTINUE;
          END IF;

          INSERT INTO tmp_credit_batch_allocations (size_id, batch_id, lot_number, quantity)
          VALUES (v_size_id, v_batch.id, v_batch.lot_number, v_allocate_qty);

          INSERT INTO tmp_credit_stock_reduction (size_id, reduction_qty)
          VALUES (v_size_id, v_allocate_qty)
          ON CONFLICT (size_id)
          DO UPDATE SET reduction_qty = tmp_credit_stock_reduction.reduction_qty + EXCLUDED.reduction_qty;

          v_remaining_units := v_remaining_units - v_allocate_qty;
        END LOOP;

        IF NOT v_has_available_batches THEN
          INSERT INTO tmp_credit_stock_reduction (size_id, reduction_qty)
          VALUES (v_size_id, v_case_qty)
          ON CONFLICT (size_id)
          DO UPDATE SET reduction_qty = tmp_credit_stock_reduction.reduction_qty + EXCLUDED.reduction_qty;
          CONTINUE;
        END IF;

        IF v_remaining_units > 0 THEN
          RAISE EXCEPTION
            'Insufficient batch stock for size % on order %. Missing units: %',
            v_size_id,
            v_order.id,
            v_remaining_units;
        END IF;
      END LOOP;
    END LOOP;

    FOR v_batch IN
      SELECT batch_id, lot_number, quantity
      FROM tmp_credit_batch_allocations
    LOOP
      SELECT COALESCE(pb.quantity_available, 0)::NUMERIC
      INTO v_batch_current_qty
      FROM public.product_batches pb
      WHERE pb.id = v_batch.batch_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Batch not found during credit approval deduction: %', v_batch.batch_id;
      END IF;

      IF v_batch_current_qty < v_batch.quantity THEN
        RAISE EXCEPTION
          'Insufficient quantity in batch % during credit approval deduction. Needed: %, available: %',
          v_batch.batch_id,
          v_batch.quantity,
          v_batch_current_qty;
      END IF;

      UPDATE public.product_batches pb
      SET quantity_available = GREATEST(0, COALESCE(pb.quantity_available, 0) - v_batch.quantity),
          status = CASE
                     WHEN GREATEST(0, COALESCE(pb.quantity_available, 0) - v_batch.quantity) = 0
                       THEN 'depleted'
                     ELSE pb.status
                   END,
          updated_at = NOW()
      WHERE pb.id = v_batch.batch_id;

      INSERT INTO public.batch_transactions (
        batch_id,
        transaction_type,
        quantity,
        reference_id,
        reference_type,
        notes
      )
      VALUES (
        v_batch.batch_id,
        'sale',
        v_batch.quantity,
        v_order.id,
        'order',
        ('Credit approval sale from lot ' || COALESCE(v_batch.lot_number, ''))
      );
    END LOOP;

    FOR v_stock_reduction IN
      SELECT size_id, reduction_qty
      FROM tmp_credit_stock_reduction
      WHERE reduction_qty > 0
    LOOP
      SELECT COALESCE(ps.stock, 0)::NUMERIC
      INTO v_size_stock_current
      FROM public.product_sizes ps
      WHERE ps.id = v_stock_reduction.size_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Product size not found during credit approval deduction: %', v_stock_reduction.size_id;
      END IF;

      UPDATE public.product_sizes ps
      SET stock = GREATEST(0, COALESCE(ps.stock, 0) - v_stock_reduction.reduction_qty),
          updated_at = NOW()
      WHERE ps.id = v_stock_reduction.size_id;
    END LOOP;

    v_stock_deducted_now := EXISTS (
      SELECT 1 FROM tmp_credit_stock_reduction WHERE reduction_qty > 0
    );

    IF NOT v_stock_marker_exists THEN
      INSERT INTO public.order_activities (
        order_id,
        activity_type,
        description,
        performed_by,
        performed_by_name,
        performed_by_email,
        metadata
      )
      VALUES (
        v_order.id,
        'updated',
        'Stock deducted after credit approval',
        COALESCE(v_admin_id, v_order.profile_id),
        'System',
        NULL,
        jsonb_build_object(
          'order_number', v_order.order_number,
          'stock_deducted_after_credit_approval', true,
          'source', 'credit_approval_rpc'
        )
      );
    END IF;
  END IF;

  v_should_charge := (NOT v_has_order_tx) AND (v_credit_invoice.id IS NULL);

  IF v_should_charge THEN
    v_available_credit := v_credit_limit - v_profile_credit_used;
    IF v_available_credit < v_total_amount THEN
      RETURN jsonb_build_object(
        'success', false,
        'status', 'credit_limit_exceeded',
        'message', 'Available credit is less than order amount',
        'available_credit', v_available_credit,
        'order_amount', v_total_amount
      );
    END IF;

    v_profile_credit_used := v_profile_credit_used + v_total_amount;

    UPDATE public.profiles p
    SET credit_used = v_profile_credit_used,
        available_credit = GREATEST(0, v_credit_limit - v_profile_credit_used),
        updated_at = NOW()
    WHERE p.id = v_profile.id;

    v_applied_credit_charge := true;
  END IF;

  IF v_invoice.id IS NULL THEN
    v_due_date := COALESCE(v_order.estimated_delivery, NOW()) + INTERVAL '30 days';

    FOR v_attempt IN 1..5 LOOP
      v_invoice_number := public.generate_invoice_number();

      BEGIN
        INSERT INTO public.invoices (
          invoice_number,
          order_id,
          profile_id,
          status,
          amount,
          tax_amount,
          total_amount,
          due_date,
          payment_method,
          payment_notes,
          notes,
          payment_status,
          purchase_number_external,
          items,
          customer_info,
          shipping_info,
          shippin_cost,
          subtotal,
          discount_amount,
          discount_details,
          paid_amount,
          created_at,
          updated_at
        )
        VALUES (
          v_invoice_number,
          v_order.id,
          v_order.profile_id,
          'pending',
          v_subtotal,
          v_tax_amount,
          v_total_amount,
          v_due_date,
          CASE
            WHEN lower(trim(both '"' from COALESCE(v_order.payment_method, ''))) IN ('card', 'ach', 'manual', 'bank_transfer')
              THEN lower(trim(both '"' from COALESCE(v_order.payment_method, '')))::public.payment_method
            ELSE 'manual'::public.payment_method
          END,
          v_order.notes,
          v_order.notes,
          'paid',
          v_order.purchase_number_external,
          CASE
            WHEN v_order.items IS NULL THEN '[]'::JSONB
            ELSE to_jsonb(v_order.items)
          END,
          CASE
            WHEN v_order."customerInfo" IS NULL THEN '{}'::JSONB
            ELSE to_jsonb(v_order."customerInfo")
          END,
          CASE
            WHEN v_order."shippingAddress" IS NULL THEN '{}'::JSONB
            ELSE to_jsonb(v_order."shippingAddress")
          END,
          COALESCE(v_order.shipping_cost, 0),
          v_subtotal,
          v_discount_amount,
          CASE
            WHEN v_order.discount_details IS NULL THEN '[]'::JSONB
            ELSE to_jsonb(v_order.discount_details)
          END,
          v_total_amount,
          NOW(),
          NOW()
        )
        RETURNING * INTO v_invoice;

        v_created_invoice := true;
        EXIT;
      EXCEPTION
        WHEN unique_violation THEN
          IF v_attempt = 5 THEN
            RAISE;
          END IF;
      END;
    END LOOP;
  END IF;

  IF NOT v_has_order_tx THEN
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
      'Credit order approved',
      v_total_amount,
      0,
      GREATEST(0, v_credit_limit - v_profile_credit_used),
      COALESCE(v_admin_id, v_order.profile_id)
    );

    v_created_tx := true;
    v_has_order_tx := true;
  END IF;

  IF v_credit_invoice.id IS NULL THEN
    SELECT
      COALESCE(ucl.net_terms, 30),
      COALESCE(ucl.credit_limit, 0),
      COALESCE(ucl.used_credit, 0)
    INTO v_net_terms, v_ucl_credit_limit, v_ucl_used_credit
    FROM public.user_credit_lines ucl
    WHERE ucl.user_id = v_order.profile_id
    FOR UPDATE;

    v_has_credit_line := FOUND;

    IF v_net_terms < 1 THEN
      v_net_terms := 30;
    END IF;

    v_credit_due_date := CURRENT_DATE + v_net_terms;

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
        )
        VALUES (
          v_credit_invoice_number,
          v_order.profile_id,
          v_order.id,
          v_total_amount,
          0,
          v_total_amount,
          0,
          v_total_amount,
          CURRENT_DATE,
          v_credit_due_date,
          'pending',
          'Created from credit order approval',
          NOW(),
          NOW()
        )
        RETURNING * INTO v_credit_invoice;

        v_created_credit_invoice := true;
        EXIT;
      EXCEPTION
        WHEN unique_violation THEN
          IF v_attempt = 5 THEN
            RAISE;
          END IF;
      END;
    END LOOP;

    IF v_has_credit_line AND v_should_charge THEN
      v_ucl_used_credit := v_ucl_used_credit + v_total_amount;

      UPDATE public.user_credit_lines ucl
      SET used_credit = v_ucl_used_credit,
          available_credit = GREATEST(0, v_ucl_credit_limit - v_ucl_used_credit),
          updated_at = NOW()
      WHERE ucl.user_id = v_order.profile_id;
    END IF;
  END IF;

  UPDATE public.orders o
  SET status = CASE
                 WHEN COALESCE(o.status, '') = 'credit_approval_processing' THEN 'new'
                 ELSE o.status
               END,
      payment_status = 'paid',
      payment_method = 'credit',
      invoice_created = true,
      invoice_number = COALESCE(v_invoice.invoice_number, o.invoice_number),
      invoice_id = COALESCE(v_invoice.id::TEXT, o.invoice_id),
      updated_at = NOW()
  WHERE o.id = v_order.id
  RETURNING * INTO v_order;

  RETURN jsonb_build_object(
    'success', true,
    'status', CASE
                WHEN v_created_invoice OR v_created_tx OR v_created_credit_invoice OR v_applied_credit_charge
                  OR COALESCE(v_order.status, '') = 'new'
                  THEN 'approved'
                ELSE 'already_processed'
              END,
    'message', CASE
                 WHEN v_created_invoice OR v_created_tx OR v_created_credit_invoice OR v_applied_credit_charge
                   THEN 'Credit order approved successfully'
                 ELSE 'Credit order already processed'
               END,
    'order_id', v_order.id,
    'order_status', v_order.status,
    'invoice_id', v_invoice.id,
    'invoice_number', v_invoice.invoice_number,
    'credit_invoice_id', v_credit_invoice.id,
    'credit_invoice_number', v_credit_invoice.invoice_number,
    'credit_used', v_profile_credit_used,
    'available_credit', GREATEST(0, v_credit_limit - v_profile_credit_used),
    'created_invoice', v_created_invoice,
    'created_account_transaction', v_created_tx,
    'created_credit_invoice', v_created_credit_invoice,
    'applied_credit_charge', v_applied_credit_charge,
    'stock_deducted', v_stock_deducted_now,
    'stock_already_deducted', v_stock_marker_exists AND NOT v_should_deduct_stock
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_credit_order_atomic(UUID) TO authenticated;

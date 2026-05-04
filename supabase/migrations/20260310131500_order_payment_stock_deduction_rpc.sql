-- Deduct order stock after successful non-credit payment (card/ACH/manual paid flows).
-- Runs as SECURITY DEFINER to bypass inventory RLS for authorized users.

CREATE OR REPLACE FUNCTION public.deduct_order_stock_after_payment_atomic(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_actor_id UUID := auth.uid();
  v_is_admin BOOLEAN := false;
  v_is_group_owner BOOLEAN := false;
  v_marker_exists BOOLEAN := false;
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
  v_allocate_qty NUMERIC(12,2);
  v_stock_deducted_now BOOLEAN := false;
BEGIN
  IF p_order_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'status', 'error', 'message', 'Order ID is required');
  END IF;

  IF v_actor_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'status', 'forbidden', 'message', 'Authentication required');
  END IF;

  SELECT *
  INTO v_order
  FROM public.orders o
  WHERE o.id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'status', 'not_found', 'message', 'Order not found');
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = v_actor_id
      AND (p.role IN ('admin', 'superadmin') OR p.type::TEXT = 'admin')
  ) INTO v_is_admin;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = v_order.profile_id
      AND p.group_id = v_actor_id
  ) INTO v_is_group_owner;

  IF NOT v_is_admin
     AND v_actor_id <> v_order.profile_id
     AND COALESCE(v_order.location_id, '00000000-0000-0000-0000-000000000000'::UUID) <> v_actor_id
     AND NOT v_is_group_owner THEN
    RETURN jsonb_build_object('success', false, 'status', 'forbidden', 'message', 'Not allowed to deduct stock for this order');
  END IF;

  -- Credit orders are handled at admin approval stage, not here.
  IF COALESCE(v_order.payment_method, '') = 'credit' THEN
    RETURN jsonb_build_object('success', true, 'status', 'skipped', 'message', 'Credit order stock is deducted at approval stage');
  END IF;

  IF COALESCE(v_order.payment_status, '') <> 'paid' THEN
    RETURN jsonb_build_object('success', false, 'status', 'invalid_status', 'message', 'Order must be paid before stock deduction');
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.order_activities oa
    WHERE oa.order_id = v_order.id
      AND oa.activity_type = 'updated'
      AND COALESCE(oa.metadata, '{}'::jsonb) @> '{"stock_deducted_after_payment": true, "source": "order_payment_rpc"}'::jsonb
  ) INTO v_marker_exists;

  IF v_marker_exists THEN
    RETURN jsonb_build_object(
      'success', true,
      'status', 'already_processed',
      'message', 'Stock already deducted for this order',
      'stock_deducted', false,
      'stock_already_deducted', true
    );
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS tmp_payment_batch_allocations (
    size_id UUID NOT NULL,
    batch_id UUID NOT NULL,
    lot_number TEXT,
    quantity NUMERIC(12,2) NOT NULL
  ) ON COMMIT DROP;

  CREATE TEMP TABLE IF NOT EXISTS tmp_payment_stock_reduction (
    size_id UUID PRIMARY KEY,
    reduction_qty NUMERIC(12,2) NOT NULL DEFAULT 0
  ) ON COMMIT DROP;

  TRUNCATE TABLE tmp_payment_batch_allocations;
  TRUNCATE TABLE tmp_payment_stock_reduction;

  FOR v_item IN
    SELECT value
    FROM jsonb_array_elements(COALESCE(to_jsonb(v_order.items), '[]'::jsonb))
  LOOP
    FOR v_size IN
      SELECT value
      FROM jsonb_array_elements(COALESCE(v_item->'sizes', '[]'::jsonb))
    LOOP
      IF COALESCE((v_item->>'isManualItem')::BOOLEAN, false)
        OR v_item->>'source' = 'sales_manual'
        OR v_size->>'source' = 'sales_manual'
        OR lower(COALESCE(v_size->>'type', '')) = 'manual'
        OR COALESCE(v_item->>'productId', '') LIKE 'manual-order-%'
        OR COALESCE(v_item->>'productId', '') LIKE 'manual-po-%'
        OR COALESCE(v_size->>'id', '') LIKE 'manual-order-%'
        OR COALESCE(v_size->>'id', '') LIKE 'manual-po-%'
      THEN
        CONTINUE;
      END IF;

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

        INSERT INTO tmp_payment_batch_allocations (size_id, batch_id, lot_number, quantity)
        VALUES (v_size_id, v_batch.id, v_batch.lot_number, v_allocate_qty);

        INSERT INTO tmp_payment_stock_reduction (size_id, reduction_qty)
        VALUES (v_size_id, v_allocate_qty)
        ON CONFLICT (size_id)
        DO UPDATE SET reduction_qty = tmp_payment_stock_reduction.reduction_qty + EXCLUDED.reduction_qty;

        v_remaining_units := v_remaining_units - v_allocate_qty;
      END LOOP;

      IF NOT v_has_available_batches THEN
        INSERT INTO tmp_payment_stock_reduction (size_id, reduction_qty)
        VALUES (v_size_id, v_case_qty)
        ON CONFLICT (size_id)
        DO UPDATE SET reduction_qty = tmp_payment_stock_reduction.reduction_qty + EXCLUDED.reduction_qty;
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
    FROM tmp_payment_batch_allocations
  LOOP
    SELECT COALESCE(pb.quantity_available, 0)::NUMERIC
    INTO v_batch_current_qty
    FROM public.product_batches pb
    WHERE pb.id = v_batch.batch_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Batch not found during payment stock deduction: %', v_batch.batch_id;
    END IF;

    IF v_batch_current_qty < v_batch.quantity THEN
      RAISE EXCEPTION
        'Insufficient quantity in batch % during payment stock deduction. Needed: %, available: %',
        v_batch.batch_id,
        v_batch.quantity,
        v_batch_current_qty;
    END IF;

    UPDATE public.product_batches pb
    SET quantity_available = GREATEST(0, COALESCE(pb.quantity_available, 0) - v_batch.quantity),
        status = CASE
                   WHEN GREATEST(0, COALESCE(pb.quantity_available, 0) - v_batch.quantity) = 0 THEN 'depleted'
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
      ('Payment sale from lot ' || COALESCE(v_batch.lot_number, ''))
    );
  END LOOP;

  FOR v_stock_reduction IN
    SELECT size_id, reduction_qty
    FROM tmp_payment_stock_reduction
    WHERE reduction_qty > 0
  LOOP
    UPDATE public.product_sizes ps
    SET stock = GREATEST(0, COALESCE(ps.stock, 0) - v_stock_reduction.reduction_qty),
        updated_at = NOW()
    WHERE ps.id = v_stock_reduction.size_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product size not found during payment stock deduction: %', v_stock_reduction.size_id;
    END IF;
  END LOOP;

  v_stock_deducted_now := EXISTS (
    SELECT 1 FROM tmp_payment_stock_reduction WHERE reduction_qty > 0
  );

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
    'Stock deducted after successful payment',
    v_actor_id,
    'System',
    NULL,
    jsonb_build_object(
      'order_number', v_order.order_number,
      'stock_deducted_after_payment', true,
      'source', 'order_payment_rpc'
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'status', 'processed',
    'message', 'Stock deducted successfully',
    'stock_deducted', v_stock_deducted_now,
    'stock_already_deducted', false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.deduct_order_stock_after_payment_atomic(UUID) TO authenticated;

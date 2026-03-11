-- Order edit inventory reconciliation:
-- - Increase in item quantity: deduct stock only after successful additional payment action.
-- - Decrease in item quantity: restore stock only after successful refund/credit action.
-- - Uses order item delta (old vs new) and is idempotent via adjustment key marker.

CREATE OR REPLACE FUNCTION public.apply_order_edit_inventory_adjustment_atomic(
  p_order_id UUID,
  p_old_items JSONB,
  p_new_items JSONB,
  p_adjustment_action TEXT,
  p_adjustment_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_actor_id UUID := auth.uid();
  v_is_admin BOOLEAN := false;
  v_marker_exists BOOLEAN := false;
  v_effective_key TEXT;
  v_old_item JSONB;
  v_old_size JSONB;
  v_new_item JSONB;
  v_new_size JSONB;
  v_size_id UUID;
  v_case_qty NUMERIC(12,2);
  v_qty_per_case NUMERIC(12,2);
  v_unit_qty NUMERIC(12,2);
  v_delta RECORD;
  v_batch RECORD;
  v_restore_sale RECORD;
  v_remaining_units NUMERIC(12,2);
  v_restore_units NUMERIC(12,2);
  v_restore_cases NUMERIC(12,2);
  v_restore_from_batches NUMERIC(12,2);
  v_fallback_qty NUMERIC(12,2);
  v_has_available_batches BOOLEAN;
  v_batch_current_qty NUMERIC(12,2);
  v_allocate_qty NUMERIC(12,2);
  v_any_changes BOOLEAN := false;
BEGIN
  IF p_order_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'status', 'error', 'message', 'Order ID is required');
  END IF;

  -- Allow service-role/internal calls where auth.uid() is NULL.
  -- Client-side calls still require admin check below.

  SELECT *
  INTO v_order
  FROM public.orders o
  WHERE o.id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'status', 'not_found', 'message', 'Order not found');
  END IF;

  IF v_actor_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = v_actor_id
        AND (p.role IN ('admin', 'superadmin') OR p.type::TEXT = 'admin')
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
      RETURN jsonb_build_object('success', false, 'status', 'forbidden', 'message', 'Only admins can apply order edit inventory adjustments');
    END IF;
  END IF;

  IF COALESCE(p_adjustment_action, '') NOT IN (
    'collect_payment',
    'use_credit',
    'issue_credit_memo',
    'process_refund',
    'none',
    'send_payment_link'
  ) THEN
    RETURN jsonb_build_object(
      'success', true,
      'status', 'skipped',
      'message', 'Adjustment action does not move inventory',
      'inventory_changed', false
    );
  END IF;

  v_effective_key := COALESCE(
    NULLIF(TRIM(COALESCE(p_adjustment_key, '')), ''),
    md5(
      COALESCE(p_order_id::TEXT, '') || '|' ||
      COALESCE(p_adjustment_action, '') || '|' ||
      COALESCE(p_old_items::TEXT, '') || '|' ||
      COALESCE(p_new_items::TEXT, '')
    )
  );

  SELECT EXISTS (
    SELECT 1
    FROM public.order_activities oa
    WHERE oa.order_id = v_order.id
      AND oa.activity_type = 'updated'
      AND COALESCE(oa.metadata, '{}'::jsonb) @> jsonb_build_object(
        'source', 'order_edit_inventory_rpc',
        'order_edit_inventory_adjustment_key', v_effective_key
      )
  ) INTO v_marker_exists;

  IF v_marker_exists THEN
    RETURN jsonb_build_object(
      'success', true,
      'status', 'already_processed',
      'message', 'Inventory adjustment already processed for this key',
      'inventory_changed', false
    );
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS tmp_order_edit_deltas (
    size_id UUID PRIMARY KEY,
    delta_cases NUMERIC(12,2) NOT NULL DEFAULT 0,
    delta_units NUMERIC(12,2) NOT NULL DEFAULT 0
  ) ON COMMIT DROP;

  CREATE TEMP TABLE IF NOT EXISTS tmp_order_edit_batch_deduct (
    size_id UUID NOT NULL,
    batch_id UUID NOT NULL,
    lot_number TEXT,
    quantity NUMERIC(12,2) NOT NULL
  ) ON COMMIT DROP;

  CREATE TEMP TABLE IF NOT EXISTS tmp_order_edit_batch_restore (
    size_id UUID NOT NULL,
    batch_id UUID NOT NULL,
    lot_number TEXT,
    quantity NUMERIC(12,2) NOT NULL
  ) ON COMMIT DROP;

  CREATE TEMP TABLE IF NOT EXISTS tmp_order_edit_size_stock (
    size_id UUID PRIMARY KEY,
    stock_delta NUMERIC(12,2) NOT NULL DEFAULT 0
  ) ON COMMIT DROP;

  TRUNCATE TABLE tmp_order_edit_deltas;
  TRUNCATE TABLE tmp_order_edit_batch_deduct;
  TRUNCATE TABLE tmp_order_edit_batch_restore;
  TRUNCATE TABLE tmp_order_edit_size_stock;

  FOR v_old_item IN
    SELECT value
    FROM jsonb_array_elements(COALESCE(p_old_items, '[]'::jsonb))
  LOOP
    FOR v_old_size IN
      SELECT value
      FROM jsonb_array_elements(COALESCE(v_old_item->'sizes', '[]'::jsonb))
    LOOP
      v_size_id := NULL;
      BEGIN
        IF NULLIF(v_old_size->>'id', '') IS NOT NULL THEN
          v_size_id := (v_old_size->>'id')::UUID;
        END IF;
      EXCEPTION
        WHEN invalid_text_representation THEN
          RAISE EXCEPTION 'Invalid size id in old_items for order %: %', v_order.id, v_old_size->>'id';
      END;

      IF v_size_id IS NULL THEN
        CONTINUE;
      END IF;

      v_case_qty := COALESCE(NULLIF(v_old_size->>'quantity', '')::NUMERIC, 0);
      IF v_case_qty <= 0 THEN
        CONTINUE;
      END IF;

      v_qty_per_case := GREATEST(1, COALESCE(NULLIF(v_old_size->>'quantity_per_case', '')::NUMERIC, 1));
      v_unit_qty := v_case_qty * v_qty_per_case;

      INSERT INTO tmp_order_edit_deltas (size_id, delta_cases, delta_units)
      VALUES (v_size_id, -v_case_qty, -v_unit_qty)
      ON CONFLICT (size_id)
      DO UPDATE
      SET delta_cases = tmp_order_edit_deltas.delta_cases + EXCLUDED.delta_cases,
          delta_units = tmp_order_edit_deltas.delta_units + EXCLUDED.delta_units;
    END LOOP;
  END LOOP;

  FOR v_new_item IN
    SELECT value
    FROM jsonb_array_elements(COALESCE(p_new_items, '[]'::jsonb))
  LOOP
    FOR v_new_size IN
      SELECT value
      FROM jsonb_array_elements(COALESCE(v_new_item->'sizes', '[]'::jsonb))
    LOOP
      v_size_id := NULL;
      BEGIN
        IF NULLIF(v_new_size->>'id', '') IS NOT NULL THEN
          v_size_id := (v_new_size->>'id')::UUID;
        END IF;
      EXCEPTION
        WHEN invalid_text_representation THEN
          RAISE EXCEPTION 'Invalid size id in new_items for order %: %', v_order.id, v_new_size->>'id';
      END;

      IF v_size_id IS NULL THEN
        CONTINUE;
      END IF;

      v_case_qty := COALESCE(NULLIF(v_new_size->>'quantity', '')::NUMERIC, 0);
      IF v_case_qty <= 0 THEN
        CONTINUE;
      END IF;

      v_qty_per_case := GREATEST(1, COALESCE(NULLIF(v_new_size->>'quantity_per_case', '')::NUMERIC, 1));
      v_unit_qty := v_case_qty * v_qty_per_case;

      INSERT INTO tmp_order_edit_deltas (size_id, delta_cases, delta_units)
      VALUES (v_size_id, v_case_qty, v_unit_qty)
      ON CONFLICT (size_id)
      DO UPDATE
      SET delta_cases = tmp_order_edit_deltas.delta_cases + EXCLUDED.delta_cases,
          delta_units = tmp_order_edit_deltas.delta_units + EXCLUDED.delta_units;
    END LOOP;
  END LOOP;

  FOR v_delta IN
    SELECT size_id, delta_cases, delta_units
    FROM tmp_order_edit_deltas
    WHERE delta_cases <> 0 OR delta_units <> 0
  LOOP
    IF v_delta.delta_units > 0 THEN
      v_remaining_units := v_delta.delta_units;
      v_has_available_batches := false;

      FOR v_batch IN
        SELECT pb.id, pb.lot_number, COALESCE(pb.quantity_available, 0)::NUMERIC AS quantity_available
        FROM public.product_batches pb
        WHERE pb.product_size_id = v_delta.size_id
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

        INSERT INTO tmp_order_edit_batch_deduct (size_id, batch_id, lot_number, quantity)
        VALUES (v_delta.size_id, v_batch.id, v_batch.lot_number, v_allocate_qty);

        v_remaining_units := v_remaining_units - v_allocate_qty;
      END LOOP;

      IF v_has_available_batches THEN
        IF v_remaining_units > 0 THEN
          RAISE EXCEPTION
            'Insufficient batch stock for order edit (size %, order %). Missing units: %',
            v_delta.size_id,
            v_order.id,
            v_remaining_units;
        END IF;

        INSERT INTO tmp_order_edit_size_stock (size_id, stock_delta)
        VALUES (v_delta.size_id, -v_delta.delta_units)
        ON CONFLICT (size_id)
        DO UPDATE
        SET stock_delta = tmp_order_edit_size_stock.stock_delta + EXCLUDED.stock_delta;
      ELSE
        v_fallback_qty := CASE
          WHEN v_delta.delta_cases > 0 THEN v_delta.delta_cases
          ELSE v_delta.delta_units
        END;

        INSERT INTO tmp_order_edit_size_stock (size_id, stock_delta)
        VALUES (v_delta.size_id, -v_fallback_qty)
        ON CONFLICT (size_id)
        DO UPDATE
        SET stock_delta = tmp_order_edit_size_stock.stock_delta + EXCLUDED.stock_delta;
      END IF;
    ELSIF v_delta.delta_units < 0 THEN
      v_restore_units := ABS(v_delta.delta_units);
      v_restore_cases := ABS(v_delta.delta_cases);
      v_remaining_units := v_restore_units;
      v_restore_from_batches := 0;

      FOR v_restore_sale IN
        WITH sold AS (
          SELECT
            bt.batch_id,
            SUM(COALESCE(bt.quantity, 0))::NUMERIC AS sold_qty
          FROM public.batch_transactions bt
          JOIN public.product_batches pb ON pb.id = bt.batch_id
          WHERE bt.reference_id = v_order.id
            AND bt.reference_type = 'order'
            AND bt.transaction_type = 'sale'
            AND pb.product_size_id = v_delta.size_id
          GROUP BY bt.batch_id
        ),
        restored AS (
          SELECT
            bt.batch_id,
            SUM(COALESCE(bt.quantity, 0))::NUMERIC AS restored_qty
          FROM public.batch_transactions bt
          WHERE bt.reference_id = v_order.id
            AND bt.reference_type = 'order_edit_restore'
            AND bt.transaction_type = 'return'
          GROUP BY bt.batch_id
        )
        SELECT
          pb.id AS batch_id,
          pb.lot_number,
          GREATEST(0, sold.sold_qty - COALESCE(restored.restored_qty, 0))::NUMERIC AS available_restore_qty
        FROM sold
        JOIN public.product_batches pb ON pb.id = sold.batch_id
        LEFT JOIN restored ON restored.batch_id = sold.batch_id
        WHERE GREATEST(0, sold.sold_qty - COALESCE(restored.restored_qty, 0)) > 0
        ORDER BY pb.updated_at DESC NULLS LAST, pb.created_at DESC NULLS LAST
        FOR UPDATE OF pb
      LOOP
        EXIT WHEN v_remaining_units <= 0;

        v_allocate_qty := LEAST(v_remaining_units, v_restore_sale.available_restore_qty);
        IF v_allocate_qty <= 0 THEN
          CONTINUE;
        END IF;

        INSERT INTO tmp_order_edit_batch_restore (size_id, batch_id, lot_number, quantity)
        VALUES (v_delta.size_id, v_restore_sale.batch_id, v_restore_sale.lot_number, v_allocate_qty);

        v_restore_from_batches := v_restore_from_batches + v_allocate_qty;
        v_remaining_units := v_remaining_units - v_allocate_qty;
      END LOOP;

      IF v_restore_from_batches > 0 THEN
        INSERT INTO tmp_order_edit_size_stock (size_id, stock_delta)
        VALUES (v_delta.size_id, v_restore_from_batches)
        ON CONFLICT (size_id)
        DO UPDATE
        SET stock_delta = tmp_order_edit_size_stock.stock_delta + EXCLUDED.stock_delta;

        IF v_remaining_units > 0 THEN
          INSERT INTO tmp_order_edit_size_stock (size_id, stock_delta)
          VALUES (v_delta.size_id, v_remaining_units)
          ON CONFLICT (size_id)
          DO UPDATE
          SET stock_delta = tmp_order_edit_size_stock.stock_delta + EXCLUDED.stock_delta;
        END IF;
      ELSE
        v_fallback_qty := CASE
          WHEN v_restore_cases > 0 THEN v_restore_cases
          ELSE v_restore_units
        END;

        INSERT INTO tmp_order_edit_size_stock (size_id, stock_delta)
        VALUES (v_delta.size_id, v_fallback_qty)
        ON CONFLICT (size_id)
        DO UPDATE
        SET stock_delta = tmp_order_edit_size_stock.stock_delta + EXCLUDED.stock_delta;
      END IF;
    END IF;
  END LOOP;

  FOR v_batch IN
    SELECT batch_id, lot_number, quantity
    FROM tmp_order_edit_batch_deduct
    WHERE quantity > 0
  LOOP
    SELECT COALESCE(pb.quantity_available, 0)::NUMERIC
    INTO v_batch_current_qty
    FROM public.product_batches pb
    WHERE pb.id = v_batch.batch_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Batch not found during order edit deduction: %', v_batch.batch_id;
    END IF;

    IF v_batch_current_qty < v_batch.quantity THEN
      RAISE EXCEPTION
        'Insufficient quantity in batch % during order edit deduction. Needed: %, available: %',
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
      ('Order edit increase deduction from lot ' || COALESCE(v_batch.lot_number, ''))
    );
  END LOOP;

  FOR v_batch IN
    SELECT batch_id, lot_number, quantity
    FROM tmp_order_edit_batch_restore
    WHERE quantity > 0
  LOOP
    UPDATE public.product_batches pb
    SET quantity_available = COALESCE(pb.quantity_available, 0) + v_batch.quantity,
        status = CASE
                   WHEN COALESCE(pb.status, '') = 'depleted' THEN 'active'
                   ELSE pb.status
                 END,
        updated_at = NOW()
    WHERE pb.id = v_batch.batch_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Batch not found during order edit restore: %', v_batch.batch_id;
    END IF;

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
      'return',
      v_batch.quantity,
      v_order.id,
      'order_edit_restore',
      ('Order edit decrease restore to lot ' || COALESCE(v_batch.lot_number, ''))
    );
  END LOOP;

  FOR v_delta IN
    SELECT size_id, stock_delta
    FROM tmp_order_edit_size_stock
    WHERE stock_delta <> 0
  LOOP
    UPDATE public.product_sizes ps
    SET stock = GREATEST(0, COALESCE(ps.stock, 0) + v_delta.stock_delta),
        updated_at = NOW()
    WHERE ps.id = v_delta.size_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product size not found during order edit inventory adjustment: %', v_delta.size_id;
    END IF;
  END LOOP;

  v_any_changes := EXISTS (
    SELECT 1 FROM tmp_order_edit_size_stock WHERE stock_delta <> 0
  ) OR EXISTS (
    SELECT 1 FROM tmp_order_edit_batch_deduct WHERE quantity > 0
  ) OR EXISTS (
    SELECT 1 FROM tmp_order_edit_batch_restore WHERE quantity > 0
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
    'Order edit inventory adjustment applied',
    v_actor_id,
    'System',
    NULL,
    jsonb_build_object(
      'order_number', v_order.order_number,
      'source', 'order_edit_inventory_rpc',
      'order_edit_inventory_adjustment_key', v_effective_key,
      'adjustment_action', p_adjustment_action,
      'inventory_changed', v_any_changes
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'status', 'processed',
    'message', 'Order edit inventory adjustment applied',
    'inventory_changed', v_any_changes
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_order_edit_inventory_adjustment_atomic(UUID, JSONB, JSONB, TEXT, TEXT) TO authenticated;

-- Queue table for deferred order-edit inventory application.
CREATE TABLE IF NOT EXISTS public.order_inventory_adjustment_queue (
  order_id UUID PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  old_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  new_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  adjustment_action TEXT NOT NULL,
  adjustment_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'cancelled')),
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_at TIMESTAMPTZ NULL,
  applied_result JSONB NULL
);

ALTER TABLE public.order_inventory_adjustment_queue ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'order_inventory_adjustment_queue'
      AND policyname = 'order_inventory_adjustment_queue_admin_only'
  ) THEN
    CREATE POLICY "order_inventory_adjustment_queue_admin_only"
    ON public.order_inventory_adjustment_queue
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND (p.role IN ('admin', 'superadmin') OR p.type::TEXT = 'admin')
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND (p.role IN ('admin', 'superadmin') OR p.type::TEXT = 'admin')
      )
    );
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.queue_order_edit_inventory_adjustment(
  p_order_id UUID,
  p_old_items JSONB,
  p_new_items JSONB,
  p_adjustment_action TEXT,
  p_adjustment_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_is_admin BOOLEAN := false;
  v_order_exists BOOLEAN := false;
  v_effective_key TEXT;
BEGIN
  IF p_order_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'status', 'error', 'message', 'Order ID is required');
  END IF;

  IF v_actor_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'status', 'forbidden', 'message', 'Authentication required');
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = v_actor_id
      AND (p.role IN ('admin', 'superadmin') OR p.type::TEXT = 'admin')
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'status', 'forbidden', 'message', 'Only admins can queue inventory adjustments');
  END IF;

  IF COALESCE(p_adjustment_action, '') NOT IN ('none', 'send_payment_link') THEN
    RETURN jsonb_build_object('success', false, 'status', 'invalid_action', 'message', 'Only none/send_payment_link can be queued');
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.orders o WHERE o.id = p_order_id) INTO v_order_exists;
  IF NOT v_order_exists THEN
    RETURN jsonb_build_object('success', false, 'status', 'not_found', 'message', 'Order not found');
  END IF;

  v_effective_key := COALESCE(
    NULLIF(TRIM(COALESCE(p_adjustment_key, '')), ''),
    md5(
      COALESCE(p_order_id::TEXT, '') || '|' ||
      COALESCE(p_adjustment_action, '') || '|' ||
      COALESCE(p_old_items::TEXT, '') || '|' ||
      COALESCE(p_new_items::TEXT, '')
    )
  );

  INSERT INTO public.order_inventory_adjustment_queue (
    order_id,
    old_items,
    new_items,
    adjustment_action,
    adjustment_key,
    status,
    created_by,
    created_at,
    updated_at,
    applied_at,
    applied_result
  )
  VALUES (
    p_order_id,
    COALESCE(p_old_items, '[]'::jsonb),
    COALESCE(p_new_items, '[]'::jsonb),
    p_adjustment_action,
    v_effective_key,
    'pending',
    v_actor_id,
    NOW(),
    NOW(),
    NULL,
    NULL
  )
  ON CONFLICT (order_id)
  DO UPDATE SET
    old_items = EXCLUDED.old_items,
    new_items = EXCLUDED.new_items,
    adjustment_action = EXCLUDED.adjustment_action,
    adjustment_key = EXCLUDED.adjustment_key,
    status = 'pending',
    created_by = EXCLUDED.created_by,
    updated_at = NOW(),
    applied_at = NULL,
    applied_result = NULL;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'queued',
    'message', 'Order edit inventory adjustment queued',
    'adjustment_key', v_effective_key
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_pending_order_edit_inventory_adjustment_atomic(
  p_order_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_queue public.order_inventory_adjustment_queue%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_apply_result JSONB;
BEGIN
  IF p_order_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'status', 'error', 'message', 'Order ID is required');
  END IF;

  SELECT *
  INTO v_order
  FROM public.orders o
  WHERE o.id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'status', 'not_found', 'message', 'Order not found');
  END IF;

  SELECT *
  INTO v_queue
  FROM public.order_inventory_adjustment_queue q
  WHERE q.order_id = p_order_id
    AND q.status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', true, 'status', 'skipped', 'message', 'No pending inventory adjustment');
  END IF;

  IF COALESCE(v_order.payment_status, '') NOT IN ('paid', 'partial_paid') THEN
    RETURN jsonb_build_object(
      'success', true,
      'status', 'not_ready',
      'message', 'Order payment status is not eligible yet',
      'payment_status', v_order.payment_status
    );
  END IF;

  SELECT public.apply_order_edit_inventory_adjustment_atomic(
    p_order_id,
    v_queue.old_items,
    v_queue.new_items,
    v_queue.adjustment_action,
    v_queue.adjustment_key
  ) INTO v_apply_result;

  IF COALESCE((v_apply_result->>'success')::BOOLEAN, false) IS NOT TRUE THEN
    RETURN COALESCE(
      v_apply_result,
      jsonb_build_object('success', false, 'status', 'error', 'message', 'Failed to apply pending inventory adjustment')
    );
  END IF;

  UPDATE public.order_inventory_adjustment_queue
  SET status = 'applied',
      applied_at = NOW(),
      updated_at = NOW(),
      applied_result = v_apply_result
  WHERE order_id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'applied',
    'message', 'Pending inventory adjustment applied',
    'result', v_apply_result
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.queue_order_edit_inventory_adjustment(UUID, JSONB, JSONB, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_pending_order_edit_inventory_adjustment_atomic(UUID) TO authenticated;

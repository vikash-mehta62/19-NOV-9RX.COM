-- Backfill Credit Invoices for Existing Credit Orders
-- This script creates credit invoices for orders that were approved with credit payment
-- but don't have corresponding credit invoices yet

DO $$
DECLARE
  v_order RECORD;
  v_result JSONB;
BEGIN
  -- Loop through all credit orders that don't have credit invoices
  FOR v_order IN 
    SELECT o.id, o.order_number, o.profile_id, o.total_amount, o.created_at
    FROM orders o
    LEFT JOIN credit_invoices ci ON o.id = ci.order_id
    WHERE o.payment_method = 'credit'
      AND o.status IN ('new', 'processing', 'confirmed', 'shipped', 'delivered', 'completed')
      AND ci.id IS NULL
    ORDER BY o.created_at ASC
  LOOP
    BEGIN
      -- Create credit invoice for this order
      SELECT create_credit_invoice(
        v_order.profile_id,
        v_order.id,
        v_order.total_amount::DECIMAL(12,2)
      ) INTO v_result;

      IF (v_result->>'success')::BOOLEAN THEN
        RAISE NOTICE 'Created credit invoice % for order %', 
          v_result->>'invoice_number', 
          v_order.order_number;
      ELSE
        RAISE WARNING 'Failed to create credit invoice for order %: %', 
          v_order.order_number, 
          v_result->>'error';
      END IF;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error creating credit invoice for order %: %', 
        v_order.order_number, 
        SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'Credit invoice backfill completed';
END $$;

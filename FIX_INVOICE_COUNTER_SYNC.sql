-- ============================================================
-- FIX: Sync invoice_no counter with actual max invoice number
-- ============================================================
-- Problem: The centerize_data.invoice_no counter is out of sync
-- with invoices that actually exist in the database, causing
-- "duplicate key value violates unique constraint invoices_invoice_number_key"
-- errors when creating new orders.
--
-- Run this in Supabase SQL Editor to fix the counter.
-- ============================================================

-- Step 1: Check current counter vs actual max invoice number
SELECT 
  cd.invoice_no AS current_counter,
  cd.invoice_start,
  (SELECT MAX(invoice_number) FROM invoices) AS max_existing_invoice,
  (SELECT COUNT(*) FROM invoices) AS total_invoices
FROM centerize_data cd
ORDER BY cd.id DESC
LIMIT 1;

-- Step 2: Extract the numeric part from the highest invoice number 
-- and update the counter to be higher than any existing invoice
DO $$
DECLARE
  v_max_num INTEGER;
  v_current_counter INTEGER;
BEGIN
  -- Get current counter
  SELECT invoice_no INTO v_current_counter
  FROM centerize_data
  ORDER BY id DESC
  LIMIT 1;

  -- Get the max numeric suffix from existing invoices
  -- Invoice format: INV-YYYY######  (e.g., INV-2026001261)
  SELECT COALESCE(
    MAX(
      CAST(
        REGEXP_REPLACE(invoice_number, '^[A-Z]+-[0-9]{4}', '') AS INTEGER
      )
    ), 0
  ) INTO v_max_num
  FROM invoices
  WHERE invoice_number ~ '^[A-Z]+-[0-9]+$';

  RAISE NOTICE 'Current counter: %, Max invoice suffix: %', v_current_counter, v_max_num;

  -- Only update if the counter is behind
  IF v_current_counter <= v_max_num THEN
    UPDATE centerize_data
    SET invoice_no = v_max_num + 1
    WHERE id = (SELECT id FROM centerize_data ORDER BY id DESC LIMIT 1);
    
    RAISE NOTICE 'Counter updated from % to %', v_current_counter, v_max_num + 1;
  ELSE
    RAISE NOTICE 'Counter is already ahead (% > %), no update needed', v_current_counter, v_max_num;
  END IF;
END $$;

-- Step 3: Verify the fix
SELECT 
  cd.invoice_no AS updated_counter,
  cd.invoice_start,
  (SELECT MAX(invoice_number) FROM invoices) AS max_existing_invoice
FROM centerize_data cd
ORDER BY cd.id DESC
LIMIT 1;

-- Step 4 (Optional): Update the generate_invoice_number function to 
-- also verify uniqueness before returning
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invoice_no INTEGER;
  v_invoice_start TEXT;
  v_year INTEGER;
  v_invoice_number TEXT;
  v_found BOOLEAN;
  v_exists BOOLEAN;
  v_max_attempts INTEGER := 10;
  v_attempt INTEGER := 0;
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  LOOP
    v_attempt := v_attempt + 1;
    IF v_attempt > v_max_attempts THEN
      RAISE EXCEPTION 'Failed to generate unique invoice number after % attempts', v_max_attempts;
    END IF;
    
    -- Lock the row and increment atomically (no id column in RETURNING to avoid type issues)
    UPDATE centerize_data
    SET invoice_no = invoice_no + 1
    WHERE id = (SELECT id FROM centerize_data ORDER BY id DESC LIMIT 1)
    RETURNING invoice_no, invoice_start
    INTO v_invoice_no, v_invoice_start;
    
    v_found := v_invoice_no IS NOT NULL;
    
    IF NOT v_found THEN
      INSERT INTO centerize_data (invoice_no, invoice_start)
      VALUES (1, 'INV')
      RETURNING invoice_no, invoice_start
      INTO v_invoice_no, v_invoice_start;
    END IF;
    
    v_invoice_number := v_invoice_start || '-' || v_year || LPAD(v_invoice_no::TEXT, 6, '0');
    
    -- Verify this invoice number doesn't already exist
    SELECT EXISTS(
      SELECT 1 FROM invoices WHERE invoice_number = v_invoice_number
    ) INTO v_exists;
    
    IF NOT v_exists THEN
      -- Found a unique number, return it
      RETURN v_invoice_number;
    END IF;
    
    -- Number exists, loop will increment and try again
    RAISE NOTICE 'Invoice number % already exists, trying next...', v_invoice_number;
  END LOOP;
END;
$$;


-- ============================================================
-- Step 5: Fix generate_order_number function
-- ============================================================
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_no INTEGER;
  v_order_start TEXT;
  v_order_number TEXT;
  v_found BOOLEAN;
  v_exists BOOLEAN;
  v_max_attempts INTEGER := 10;
  v_attempt INTEGER := 0;
BEGIN
  LOOP
    v_attempt := v_attempt + 1;
    IF v_attempt > v_max_attempts THEN
      RAISE EXCEPTION 'Failed to generate unique order number after % attempts', v_max_attempts;
    END IF;
    
    -- Lock the row and increment atomically
    UPDATE centerize_data
    SET order_no = order_no + 1
    WHERE id = (SELECT id FROM centerize_data ORDER BY id DESC LIMIT 1)
    RETURNING order_no, order_start
    INTO v_order_no, v_order_start;
    
    v_found := v_order_no IS NOT NULL;
    
    IF NOT v_found THEN
      INSERT INTO centerize_data (order_no, order_start)
      VALUES (1, '9RX')
      RETURNING order_no, order_start
      INTO v_order_no, v_order_start;
    END IF;
    
    v_order_number := v_order_start || LPAD(v_order_no::TEXT, 6, '0');
    
    -- Verify this order number doesn't already exist
    SELECT EXISTS(
      SELECT 1 FROM orders WHERE order_number = v_order_number
    ) INTO v_exists;
    
    IF NOT v_exists THEN
      RETURN v_order_number;
    END IF;
    
    RAISE NOTICE 'Order number % already exists, trying next...', v_order_number;
  END LOOP;
END;
$$;


-- ============================================================
-- Step 6: Fix generate_purchase_order_number function
-- ============================================================
CREATE OR REPLACE FUNCTION generate_purchase_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_po_no INTEGER;
  v_po_start TEXT;
  v_po_number TEXT;
  v_found BOOLEAN;
  v_exists BOOLEAN;
  v_max_attempts INTEGER := 10;
  v_attempt INTEGER := 0;
BEGIN
  LOOP
    v_attempt := v_attempt + 1;
    IF v_attempt > v_max_attempts THEN
      RAISE EXCEPTION 'Failed to generate unique PO number after % attempts', v_max_attempts;
    END IF;
    
    -- Lock the row and increment atomically
    UPDATE centerize_data
    SET purchase_no = purchase_no + 1
    WHERE id = (SELECT id FROM centerize_data ORDER BY id DESC LIMIT 1)
    RETURNING purchase_no, purchase_start
    INTO v_po_no, v_po_start;
    
    v_found := v_po_no IS NOT NULL;
    
    IF NOT v_found THEN
      INSERT INTO centerize_data (purchase_no, purchase_start)
      VALUES (1, 'PO-9RX')
      RETURNING purchase_no, purchase_start
      INTO v_po_no, v_po_start;
    END IF;
    
    v_po_number := v_po_start || LPAD(v_po_no::TEXT, 6, '0');
    
    -- Verify this PO number doesn't already exist
    SELECT EXISTS(
      SELECT 1 FROM orders WHERE order_number = v_po_number
    ) INTO v_exists;
    
    IF NOT v_exists THEN
      RETURN v_po_number;
    END IF;
    
    RAISE NOTICE 'PO number % already exists, trying next...', v_po_number;
  END LOOP;
END;
$$;


-- ============================================================
-- Step 7: Sync order_no counter with actual max order number
-- ============================================================
DO $$
DECLARE
  v_max_order_num INTEGER;
  v_current_order_counter INTEGER;
  v_max_po_num INTEGER;
  v_current_po_counter INTEGER;
BEGIN
  -- Fix order counter
  SELECT COALESCE(order_no, 0) INTO v_current_order_counter
  FROM centerize_data ORDER BY id DESC LIMIT 1;

  SELECT COALESCE(
    MAX(CAST(REGEXP_REPLACE(order_number, '^[A-Z0-9]+[A-Z]', '') AS INTEGER)), 0
  ) INTO v_max_order_num
  FROM orders
  WHERE order_number ~ '^9RX[0-9]+$';

  IF v_current_order_counter <= v_max_order_num THEN
    UPDATE centerize_data
    SET order_no = v_max_order_num + 1
    WHERE id = (SELECT id FROM centerize_data ORDER BY id DESC LIMIT 1);
    RAISE NOTICE 'Order counter updated from % to %', v_current_order_counter, v_max_order_num + 1;
  ELSE
    RAISE NOTICE 'Order counter OK (% > %)', v_current_order_counter, v_max_order_num;
  END IF;

  -- Fix PO counter
  SELECT COALESCE(purchase_no, 0) INTO v_current_po_counter
  FROM centerize_data ORDER BY id DESC LIMIT 1;

  SELECT COALESCE(
    MAX(CAST(REGEXP_REPLACE(order_number, '^PO-9RX', '') AS INTEGER)), 0
  ) INTO v_max_po_num
  FROM orders
  WHERE order_number ~ '^PO-9RX[0-9]+$';

  IF v_current_po_counter <= v_max_po_num THEN
    UPDATE centerize_data
    SET purchase_no = v_max_po_num + 1
    WHERE id = (SELECT id FROM centerize_data ORDER BY id DESC LIMIT 1);
    RAISE NOTICE 'PO counter updated from % to %', v_current_po_counter, v_max_po_num + 1;
  ELSE
    RAISE NOTICE 'PO counter OK (% > %)', v_current_po_counter, v_max_po_num;
  END IF;
END $$;


-- ============================================================
-- Step 8: Verify all counters
-- ============================================================
SELECT 
  invoice_no,
  invoice_start,
  order_no,
  order_start,
  purchase_no,
  purchase_start
FROM centerize_data
ORDER BY id DESC
LIMIT 1;

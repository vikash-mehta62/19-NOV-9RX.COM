-- Fix invoice number duplicate key error
-- This creates a function that safely generates unique invoice numbers with proper locking

-- Create a function to generate the next invoice number atomically
CREATE OR REPLACE FUNCTION generate_next_invoice_number()
RETURNS TEXT AS $$
DECLARE
  v_invoice_no INTEGER;
  v_invoice_start TEXT;
  v_year TEXT;
  v_invoice_number TEXT;
  v_centerize_id INTEGER;
BEGIN
  -- Lock the row to prevent race conditions
  SELECT id, invoice_no, invoice_start
  INTO v_centerize_id, v_invoice_no, v_invoice_start
  FROM centerize_data
  ORDER BY id DESC
  LIMIT 1
  FOR UPDATE; -- This locks the row
  
  -- Increment the invoice number
  v_invoice_no := COALESCE(v_invoice_no, 0) + 1;
  v_invoice_start := COALESCE(v_invoice_start, 'INV');
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  -- Update the centerize_data table
  UPDATE centerize_data
  SET invoice_no = v_invoice_no
  WHERE id = v_centerize_id;
  
  -- Generate the invoice number
  v_invoice_number := v_invoice_start || '-' || v_year || LPAD(v_invoice_no::TEXT, 6, '0');
  
  RETURN v_invoice_number;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION generate_next_invoice_number() TO authenticated;

-- Test the function
SELECT generate_next_invoice_number();

-- Verify it increments properly
SELECT generate_next_invoice_number();

-- Check the current state
SELECT id, invoice_no, invoice_start FROM centerize_data ORDER BY id DESC LIMIT 1;

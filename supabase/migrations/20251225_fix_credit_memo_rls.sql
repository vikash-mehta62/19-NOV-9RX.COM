-- =====================================================
-- Fix Credit Memo RLS Policies for Pharmacy Users
-- Created: 2025-12-25
-- =====================================================

-- The main fix: Make apply_credit_memo function run with SECURITY DEFINER
-- This allows the function to bypass RLS and perform all necessary operations

-- Drop and recreate the apply_credit_memo function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION apply_credit_memo(
  p_credit_memo_id UUID,
  p_order_id UUID,
  p_amount DECIMAL(12,2),
  p_applied_by UUID
)
RETURNS JSONB AS $$
DECLARE
  v_memo RECORD;
  v_order RECORD;
  v_customer_id UUID;
  v_remaining_balance DECIMAL(12,2);
BEGIN
  -- Get credit memo
  SELECT * INTO v_memo FROM credit_memos WHERE id = p_credit_memo_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Credit memo not found');
  END IF;
  
  IF v_memo.status IN ('fully_applied', 'expired', 'cancelled') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Credit memo is not available for use');
  END IF;
  
  IF v_memo.balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient credit memo balance');
  END IF;
  
  -- Get order
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;
  
  -- Verify customer matches
  IF v_memo.customer_id != v_order.profile_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Credit memo does not belong to this customer');
  END IF;
  
  v_customer_id := v_memo.customer_id;
  v_remaining_balance := v_memo.balance - p_amount;
  
  -- Create application record
  INSERT INTO credit_memo_applications (credit_memo_id, order_id, applied_amount, applied_by)
  VALUES (p_credit_memo_id, p_order_id, p_amount, p_applied_by);
  
  -- Update credit memo
  UPDATE credit_memos
  SET 
    applied_amount = applied_amount + p_amount,
    balance = v_remaining_balance,
    status = CASE WHEN v_remaining_balance = 0 THEN 'fully_applied' ELSE 'partially_applied' END,
    updated_at = NOW()
  WHERE id = p_credit_memo_id;
  
  -- Update customer's credit memo balance
  UPDATE profiles
  SET credit_memo_balance = GREATEST(0, COALESCE(credit_memo_balance, 0) - p_amount)
  WHERE id = v_customer_id;
  
  -- Create payment adjustment record
  INSERT INTO payment_adjustments (
    adjustment_number, order_id, customer_id, adjustment_type,
    original_amount, new_amount, difference_amount,
    payment_status, credit_memo_id, processed_by, processed_at
  ) VALUES (
    generate_adjustment_number(), p_order_id, v_customer_id, 'credit_memo_applied',
    v_order.total_amount, v_order.total_amount - p_amount, -p_amount,
    'completed', p_credit_memo_id, p_applied_by, NOW()
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'applied_amount', p_amount,
    'remaining_balance', v_remaining_balance,
    'memo_status', CASE WHEN v_remaining_balance = 0 THEN 'fully_applied' ELSE 'partially_applied' END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION apply_credit_memo(UUID, UUID, DECIMAL, UUID) TO authenticated;

-- Also update issue_credit_memo to use SECURITY DEFINER
CREATE OR REPLACE FUNCTION issue_credit_memo(
  p_customer_id UUID,
  p_amount DECIMAL(12,2),
  p_reason TEXT,
  p_order_id UUID DEFAULT NULL,
  p_refund_id UUID DEFAULT NULL,
  p_items JSONB DEFAULT '[]',
  p_issued_by UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_memo_number TEXT;
  v_memo_id UUID;
BEGIN
  v_memo_number := generate_credit_memo_number();
  
  INSERT INTO credit_memos (
    memo_number, order_id, refund_id, customer_id, amount, reason, items, balance, issued_by
  ) VALUES (
    v_memo_number, p_order_id, p_refund_id, p_customer_id, p_amount, p_reason, p_items, p_amount, p_issued_by
  )
  RETURNING id INTO v_memo_id;
  
  -- Update customer's credit memo balance
  UPDATE profiles
  SET credit_memo_balance = COALESCE(credit_memo_balance, 0) + p_amount
  WHERE id = p_customer_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'credit_memo_id', v_memo_id,
    'memo_number', v_memo_number,
    'amount', p_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION issue_credit_memo(UUID, DECIMAL, TEXT, UUID, UUID, JSONB, UUID) TO authenticated;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admin can manage all credit memo applications" ON credit_memo_applications;
DROP POLICY IF EXISTS "Customers can view their credit memo applications" ON credit_memo_applications;
DROP POLICY IF EXISTS "Customers can apply their credit memos" ON credit_memo_applications;

-- Create new policies
CREATE POLICY "Admin can manage all credit memo applications" ON credit_memo_applications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND type = 'admin')
  );

CREATE POLICY "Customers can view their credit memo applications" ON credit_memo_applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM credit_memos cm 
      WHERE cm.id = credit_memo_applications.credit_memo_id 
      AND cm.customer_id = auth.uid()
    )
  );

-- Also need to allow customers to UPDATE their own credit memos (for balance update)
DROP POLICY IF EXISTS "Customers can view their credit memos" ON credit_memos;
DROP POLICY IF EXISTS "Customers can update their credit memos" ON credit_memos;

CREATE POLICY "Customers can view their credit memos" ON credit_memos
  FOR SELECT USING (customer_id = auth.uid());

-- Allow customers to insert payment adjustments for their own orders
DROP POLICY IF EXISTS "Customers can view their payment adjustments" ON payment_adjustments;
DROP POLICY IF EXISTS "Customers can insert their payment adjustments" ON payment_adjustments;

CREATE POLICY "Customers can view their payment adjustments" ON payment_adjustments
  FOR SELECT USING (customer_id = auth.uid());

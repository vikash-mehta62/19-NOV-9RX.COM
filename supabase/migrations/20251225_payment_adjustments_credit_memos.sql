-- =====================================================
-- Payment Adjustments, Credit Memos & Refunds System
-- Created: 2025-12-25
-- =====================================================

-- 1. Create Refunds Table
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_number VARCHAR(50) UNIQUE NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  original_payment_id VARCHAR(100),
  amount DECIMAL(12,2) NOT NULL,
  reason TEXT NOT NULL,
  items_returned JSONB DEFAULT '[]',
  refund_method VARCHAR(50) DEFAULT 'original_payment' CHECK (refund_method IN ('original_payment', 'store_credit', 'bank_transfer', 'credit_memo')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  processed_by UUID REFERENCES profiles(id),
  accounting_reference VARCHAR(100),
  gateway_refund_id VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT positive_refund_amount CHECK (amount > 0)
);

-- 2. Create Credit Memos Table
CREATE TABLE IF NOT EXISTS credit_memos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memo_number VARCHAR(50) UNIQUE NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  refund_id UUID REFERENCES refunds(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  reason TEXT NOT NULL,
  items JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'issued' CHECK (status IN ('issued', 'partially_applied', 'fully_applied', 'expired', 'cancelled')),
  applied_amount DECIMAL(12,2) DEFAULT 0,
  balance DECIMAL(12,2) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 year'),
  issued_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT positive_memo_amount CHECK (amount > 0),
  CONSTRAINT valid_balance CHECK (balance >= 0 AND balance <= amount)
);

-- 3. Create Credit Memo Applications Table (tracks where credit memos are used)
CREATE TABLE IF NOT EXISTS credit_memo_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_memo_id UUID REFERENCES credit_memos(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  applied_amount DECIMAL(12,2) NOT NULL,
  applied_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT positive_applied_amount CHECK (applied_amount > 0)
);

-- 4. Create Payment Adjustments Table
CREATE TABLE IF NOT EXISTS payment_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adjustment_number VARCHAR(50) UNIQUE NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  adjustment_type VARCHAR(50) NOT NULL CHECK (adjustment_type IN ('additional_payment', 'partial_refund', 'full_refund', 'credit_memo_issued', 'credit_memo_applied', 'order_modification')),
  original_amount DECIMAL(12,2) NOT NULL,
  new_amount DECIMAL(12,2) NOT NULL,
  difference_amount DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(50),
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  payment_transaction_id VARCHAR(100),
  credit_memo_id UUID REFERENCES credit_memos(id),
  refund_id UUID REFERENCES refunds(id),
  reason TEXT,
  processed_by UUID REFERENCES profiles(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- 5. Add credit_memo_balance to profiles for quick lookup
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS credit_memo_balance DECIMAL(12,2) DEFAULT 0;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_refunds_order_id ON refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_customer_id ON refunds(customer_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);
CREATE INDEX IF NOT EXISTS idx_credit_memos_customer_id ON credit_memos(customer_id);
CREATE INDEX IF NOT EXISTS idx_credit_memos_status ON credit_memos(status);
CREATE INDEX IF NOT EXISTS idx_credit_memo_applications_memo_id ON credit_memo_applications(credit_memo_id);
CREATE INDEX IF NOT EXISTS idx_credit_memo_applications_order_id ON credit_memo_applications(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_adjustments_order_id ON payment_adjustments(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_adjustments_customer_id ON payment_adjustments(customer_id);

-- 7. Function to generate refund number
CREATE OR REPLACE FUNCTION generate_refund_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  counter INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(refund_number FROM 4) AS INT)), 0) + 1
  INTO counter
  FROM refunds
  WHERE refund_number LIKE 'REF%';
  
  new_number := 'REF' || LPAD(counter::TEXT, 6, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- 8. Function to generate credit memo number
CREATE OR REPLACE FUNCTION generate_credit_memo_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  counter INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(memo_number FROM 3) AS INT)), 0) + 1
  INTO counter
  FROM credit_memos
  WHERE memo_number LIKE 'CM%';
  
  new_number := 'CM' || LPAD(counter::TEXT, 6, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- 9. Function to generate adjustment number
CREATE OR REPLACE FUNCTION generate_adjustment_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  counter INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(adjustment_number FROM 4) AS INT)), 0) + 1
  INTO counter
  FROM payment_adjustments
  WHERE adjustment_number LIKE 'ADJ%';
  
  new_number := 'ADJ' || LPAD(counter::TEXT, 6, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- 10. Function to apply credit memo to order
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
$$ LANGUAGE plpgsql;

-- 11. Function to issue credit memo
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
$$ LANGUAGE plpgsql;

-- 12. Enable RLS
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_memo_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_adjustments ENABLE ROW LEVEL SECURITY;

-- 13. RLS Policies for refunds
CREATE POLICY "Admin can manage all refunds" ON refunds
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND type = 'admin')
  );

CREATE POLICY "Customers can view their refunds" ON refunds
  FOR SELECT USING (customer_id = auth.uid());

-- 14. RLS Policies for credit_memos
CREATE POLICY "Admin can manage all credit memos" ON credit_memos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND type = 'admin')
  );

CREATE POLICY "Customers can view their credit memos" ON credit_memos
  FOR SELECT USING (customer_id = auth.uid());

-- 15. RLS Policies for credit_memo_applications
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

-- 16. RLS Policies for payment_adjustments
CREATE POLICY "Admin can manage all payment adjustments" ON payment_adjustments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND type = 'admin')
  );

CREATE POLICY "Customers can view their payment adjustments" ON payment_adjustments
  FOR SELECT USING (customer_id = auth.uid());

-- Comments
COMMENT ON TABLE refunds IS 'Stores all refund transactions';
COMMENT ON TABLE credit_memos IS 'Store credit issued to customers for returns/adjustments';
COMMENT ON TABLE credit_memo_applications IS 'Tracks where credit memos are applied';
COMMENT ON TABLE payment_adjustments IS 'Tracks all payment adjustments including additional payments and refunds';

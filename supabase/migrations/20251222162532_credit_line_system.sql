-- =====================================================
-- CREDIT LINE SYSTEM - Complete Solution
-- =====================================================

-- 1. Credit Line Applications Table
CREATE TABLE IF NOT EXISTS credit_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  requested_amount DECIMAL(12,2) NOT NULL,
  approved_amount DECIMAL(12,2),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'under_review')),
  net_terms INTEGER DEFAULT 30, -- Net 30, Net 60, etc.
  interest_rate DECIMAL(5,2) DEFAULT 3.00, -- Monthly penalty rate %
  
  -- Business Information
  business_name VARCHAR(255),
  business_type VARCHAR(100),
  years_in_business INTEGER,
  annual_revenue DECIMAL(15,2),
  tax_id VARCHAR(50),
  
  -- Bank Information
  bank_name VARCHAR(255),
  bank_account_number VARCHAR(50),
  bank_routing_number VARCHAR(50),
  
  -- References
  trade_reference_1 JSONB,
  trade_reference_2 JSONB,
  
  -- Terms acceptance
  terms_accepted BOOLEAN DEFAULT FALSE,
  terms_accepted_at TIMESTAMP WITH TIME ZONE,
  terms_version VARCHAR(20) DEFAULT '1.0',
  ip_address VARCHAR(50),
  
  -- Admin fields
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- 2. User Credit Lines Table (Active credit lines)
CREATE TABLE IF NOT EXISTS user_credit_lines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  credit_limit DECIMAL(12,2) NOT NULL DEFAULT 0,
  available_credit DECIMAL(12,2) NOT NULL DEFAULT 0,
  used_credit DECIMAL(12,2) NOT NULL DEFAULT 0,
  net_terms INTEGER DEFAULT 30,
  interest_rate DECIMAL(5,2) DEFAULT 3.00, -- Monthly penalty rate
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'closed')),
  
  -- Credit score tracking
  payment_score INTEGER DEFAULT 100, -- 0-100, decreases with late payments
  on_time_payments INTEGER DEFAULT 0,
  late_payments INTEGER DEFAULT 0,
  
  -- Dates
  approved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_payment_date TIMESTAMP WITH TIME ZONE,
  next_review_date TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- 3. Credit Invoices Table (Invoices using credit)
CREATE TABLE IF NOT EXISTS credit_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id),
  
  -- Amounts
  original_amount DECIMAL(12,2) NOT NULL,
  penalty_amount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL,
  paid_amount DECIMAL(12,2) DEFAULT 0,
  balance_due DECIMAL(12,2) NOT NULL,
  
  -- Dates
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  paid_date DATE,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'written_off')),
  days_overdue INTEGER DEFAULT 0,
  
  -- Penalty tracking
  penalty_applied BOOLEAN DEFAULT FALSE,
  penalty_calculated_at TIMESTAMP WITH TIME ZONE,
  penalty_months INTEGER DEFAULT 0,
  
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- 4. Credit Payments Table
CREATE TABLE IF NOT EXISTS credit_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  credit_invoice_id UUID REFERENCES credit_invoices(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  amount DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(50), -- card, bank_transfer, check, etc.
  transaction_id VARCHAR(100),
  
  -- Allocation
  principal_amount DECIMAL(12,2) DEFAULT 0,
  penalty_amount DECIMAL(12,2) DEFAULT 0,
  
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- 5. Credit Terms & Conditions Table
CREATE TABLE IF NOT EXISTS credit_terms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  version VARCHAR(20) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  
  -- Key terms (for display)
  net_terms_options JSONB DEFAULT '[30, 45, 60]',
  penalty_rate DECIMAL(5,2) DEFAULT 3.00,
  grace_period_days INTEGER DEFAULT 0,
  
  is_active BOOLEAN DEFAULT TRUE,
  effective_date DATE NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- 6. Penalty History Table
CREATE TABLE IF NOT EXISTS credit_penalty_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  credit_invoice_id UUID REFERENCES credit_invoices(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  penalty_amount DECIMAL(12,2) NOT NULL,
  penalty_rate DECIMAL(5,2) NOT NULL,
  days_overdue INTEGER NOT NULL,
  month_number INTEGER NOT NULL, -- Which month of overdue
  
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);
-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_credit_applications_user ON credit_applications(user_id);
CREATE INDEX idx_credit_applications_status ON credit_applications(status);
CREATE INDEX idx_user_credit_lines_user ON user_credit_lines(user_id);
CREATE INDEX idx_credit_invoices_user ON credit_invoices(user_id);
CREATE INDEX idx_credit_invoices_status ON credit_invoices(status);
CREATE INDEX idx_credit_invoices_due_date ON credit_invoices(due_date);
CREATE INDEX idx_credit_payments_invoice ON credit_payments(credit_invoice_id);
-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE credit_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credit_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_penalty_history ENABLE ROW LEVEL SECURITY;
-- Users can view their own data
CREATE POLICY "Users view own credit applications" ON credit_applications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own credit applications" ON credit_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own credit line" ON user_credit_lines
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users view own credit invoices" ON credit_invoices
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users view own credit payments" ON credit_payments
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view active credit terms" ON credit_terms
  FOR SELECT USING (is_active = true);
CREATE POLICY "Users view own penalty history" ON credit_penalty_history
  FOR SELECT USING (auth.uid() = user_id);
-- Admin policies
CREATE POLICY "Admins full access credit_applications" ON credit_applications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND type = 'admin')
  );
CREATE POLICY "Admins full access user_credit_lines" ON user_credit_lines
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND type = 'admin')
  );
CREATE POLICY "Admins full access credit_invoices" ON credit_invoices
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND type = 'admin')
  );
CREATE POLICY "Admins full access credit_payments" ON credit_payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND type = 'admin')
  );
CREATE POLICY "Admins full access credit_terms" ON credit_terms
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND type = 'admin')
  );
CREATE POLICY "Admins full access credit_penalty_history" ON credit_penalty_history
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND type = 'admin')
  );
-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to calculate and apply penalties
CREATE OR REPLACE FUNCTION calculate_credit_penalties()
RETURNS void AS $$
DECLARE
  invoice RECORD;
  days_late INTEGER;
  months_late INTEGER;
  new_penalty DECIMAL(12,2);
  penalty_rate DECIMAL(5,2);
BEGIN
  -- Loop through all overdue invoices
  FOR invoice IN 
    SELECT ci.*, ucl.interest_rate 
    FROM credit_invoices ci
    JOIN user_credit_lines ucl ON ci.user_id = ucl.user_id
    WHERE ci.status IN ('pending', 'partial', 'overdue')
    AND ci.due_date < CURRENT_DATE
    AND ci.balance_due > 0
  LOOP
    -- Calculate days overdue
    days_late := CURRENT_DATE - invoice.due_date;
    months_late := CEIL(days_late::DECIMAL / 30);
    penalty_rate := COALESCE(invoice.interest_rate, 3.00);
    
    -- Only apply penalty if new month of overdue
    IF months_late > invoice.penalty_months THEN
      -- Calculate penalty: 3% of remaining balance per month
      new_penalty := ROUND((invoice.balance_due * (penalty_rate / 100)), 2);
      
      -- Update invoice
      UPDATE credit_invoices
      SET 
        penalty_amount = penalty_amount + new_penalty,
        total_amount = original_amount + penalty_amount + new_penalty,
        balance_due = balance_due + new_penalty,
        days_overdue = days_late,
        penalty_months = months_late,
        penalty_applied = TRUE,
        penalty_calculated_at = NOW(),
        status = 'overdue',
        updated_at = NOW()
      WHERE id = invoice.id;
      
      -- Record penalty history
      INSERT INTO credit_penalty_history (
        credit_invoice_id, user_id, penalty_amount, 
        penalty_rate, days_overdue, month_number
      ) VALUES (
        invoice.id, invoice.user_id, new_penalty,
        penalty_rate, days_late, months_late
      );
      
      -- Update user's payment score
      UPDATE user_credit_lines
      SET 
        payment_score = GREATEST(0, payment_score - 5),
        late_payments = late_payments + 1,
        updated_at = NOW()
      WHERE user_id = invoice.user_id;
    ELSE
      -- Just update days overdue
      UPDATE credit_invoices
      SET 
        days_overdue = days_late,
        status = CASE WHEN days_late > 0 THEN 'overdue' ELSE status END,
        updated_at = NOW()
      WHERE id = invoice.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Function to process credit payment
CREATE OR REPLACE FUNCTION process_credit_payment(
  p_invoice_id UUID,
  p_amount DECIMAL(12,2),
  p_payment_method VARCHAR(50),
  p_transaction_id VARCHAR(100)
)
RETURNS JSONB AS $$
DECLARE
  v_invoice RECORD;
  v_penalty_payment DECIMAL(12,2) := 0;
  v_principal_payment DECIMAL(12,2) := 0;
  v_new_balance DECIMAL(12,2);
  v_new_status VARCHAR(20);
  v_payment_id UUID;
BEGIN
  -- Get invoice details
  SELECT * INTO v_invoice FROM credit_invoices WHERE id = p_invoice_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invoice not found');
  END IF;
  
  -- Allocate payment: penalties first, then principal
  IF v_invoice.penalty_amount > 0 AND p_amount > 0 THEN
    v_penalty_payment := LEAST(p_amount, v_invoice.penalty_amount - 
      COALESCE((SELECT SUM(penalty_amount) FROM credit_payments WHERE credit_invoice_id = p_invoice_id), 0));
    v_principal_payment := p_amount - v_penalty_payment;
  ELSE
    v_principal_payment := p_amount;
  END IF;
  
  -- Calculate new balance
  v_new_balance := v_invoice.balance_due - p_amount;
  
  -- Determine new status
  IF v_new_balance <= 0 THEN
    v_new_status := 'paid';
    v_new_balance := 0;
  ELSIF v_new_balance < v_invoice.total_amount THEN
    v_new_status := 'partial';
  ELSE
    v_new_status := v_invoice.status;
  END IF;
  
  -- Insert payment record
  INSERT INTO credit_payments (
    credit_invoice_id, user_id, amount, payment_method,
    transaction_id, principal_amount, penalty_amount
  ) VALUES (
    p_invoice_id, v_invoice.user_id, p_amount, p_payment_method,
    p_transaction_id, v_principal_payment, v_penalty_payment
  ) RETURNING id INTO v_payment_id;
  
  -- Update invoice
  UPDATE credit_invoices
  SET 
    paid_amount = paid_amount + p_amount,
    balance_due = v_new_balance,
    status = v_new_status,
    paid_date = CASE WHEN v_new_status = 'paid' THEN CURRENT_DATE ELSE paid_date END,
    updated_at = NOW()
  WHERE id = p_invoice_id;
  
  -- Update user's available credit
  UPDATE user_credit_lines
  SET 
    available_credit = available_credit + p_amount,
    used_credit = used_credit - p_amount,
    last_payment_date = NOW(),
    on_time_payments = CASE 
      WHEN v_invoice.due_date >= CURRENT_DATE THEN on_time_payments + 1 
      ELSE on_time_payments 
    END,
    payment_score = CASE 
      WHEN v_invoice.due_date >= CURRENT_DATE THEN LEAST(100, payment_score + 2)
      ELSE payment_score 
    END,
    updated_at = NOW()
  WHERE user_id = v_invoice.user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'new_balance', v_new_balance,
    'status', v_new_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Function to create credit invoice when order is placed
CREATE OR REPLACE FUNCTION create_credit_invoice(
  p_user_id UUID,
  p_order_id UUID,
  p_amount DECIMAL(12,2)
)
RETURNS JSONB AS $$
DECLARE
  v_credit_line RECORD;
  v_invoice_number VARCHAR(50);
  v_due_date DATE;
  v_invoice_id UUID;
BEGIN
  -- Get user's credit line
  SELECT * INTO v_credit_line FROM user_credit_lines 
  WHERE user_id = p_user_id AND status = 'active';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active credit line');
  END IF;
  
  -- Check available credit
  IF v_credit_line.available_credit < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient credit');
  END IF;
  
  -- Generate invoice number
  v_invoice_number := 'CR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
    LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  
  -- Calculate due date based on net terms
  v_due_date := CURRENT_DATE + v_credit_line.net_terms;
  
  -- Create invoice
  INSERT INTO credit_invoices (
    invoice_number, user_id, order_id, original_amount,
    total_amount, balance_due, due_date
  ) VALUES (
    v_invoice_number, p_user_id, p_order_id, p_amount,
    p_amount, p_amount, v_due_date
  ) RETURNING id INTO v_invoice_id;
  
  -- Update credit line
  UPDATE user_credit_lines
  SET 
    available_credit = available_credit - p_amount,
    used_credit = used_credit + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'invoice_id', v_invoice_id,
    'invoice_number', v_invoice_number,
    'due_date', v_due_date,
    'amount', p_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- =====================================================
-- INSERT DEFAULT CREDIT TERMS
-- =====================================================
INSERT INTO credit_terms (version, title, content, effective_date) VALUES
('1.0', 'Credit Line Terms and Conditions', 
'## 9RX Credit Line Terms and Conditions

### 1. Credit Line Agreement
By applying for and using a 9RX Credit Line, you agree to these terms and conditions.

### 2. Credit Limit
- Your credit limit is determined based on your business profile and payment history
- Credit limits range from $1,000 to $50,000
- 9RX reserves the right to adjust your credit limit at any time

### 3. Payment Terms
- **Net 30**: Payment due within 30 days of invoice date
- **Net 45**: Payment due within 45 days of invoice date  
- **Net 60**: Payment due within 60 days of invoice date

### 4. Late Payment Penalty
- A **3% monthly penalty** will be applied to any unpaid balance after the due date
- Penalties are calculated on the outstanding balance at the end of each 30-day period
- Example: $1,000 balance overdue = $30 penalty per month

### 5. Payment Allocation
- Payments are first applied to any outstanding penalties
- Remaining payment is applied to the principal balance

### 6. Credit Score Impact
- On-time payments improve your credit score with 9RX
- Late payments will negatively impact your credit score
- Consistent late payments may result in credit line suspension

### 7. Suspension and Termination
- 9RX may suspend your credit line for:
  - Payments more than 60 days overdue
  - Exceeding your credit limit
  - Violation of these terms
- You may close your credit line at any time by paying all outstanding balances

### 8. Dispute Resolution
- Contact our credit department within 30 days to dispute any charges
- Email: credit@9rx.com
- Phone: +1 (800) 969-6295

### 9. Governing Law
These terms are governed by the laws of North Carolina, USA.

**Last Updated: December 2024**',
CURRENT_DATE);

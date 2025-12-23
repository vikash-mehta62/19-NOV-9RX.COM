-- Payment Methods table for saved cards and bank accounts
CREATE TABLE IF NOT EXISTS saved_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Authorize.net Customer Profile
  customer_profile_id text, -- Authorize.net customer profile ID
  payment_profile_id text NOT NULL, -- Authorize.net payment profile ID
  
  -- Payment method type
  method_type text NOT NULL CHECK (method_type IN ('card', 'ach')),
  
  -- Card details (masked)
  card_last_four text,
  card_type text, -- visa, mastercard, amex, discover
  card_expiry_month integer,
  card_expiry_year integer,
  
  -- ACH details (masked)
  bank_name text,
  account_type text, -- checking, savings
  account_last_four text,
  routing_last_four text,
  
  -- Billing address
  billing_first_name text,
  billing_last_name text,
  billing_address text,
  billing_city text,
  billing_state text,
  billing_zip text,
  billing_country text DEFAULT 'USA',
  
  -- Status
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  nickname text, -- User-friendly name like "My Visa ending 4242"
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_saved_payment_methods_profile ON saved_payment_methods(profile_id);
CREATE INDEX IF NOT EXISTS idx_saved_payment_methods_customer_profile ON saved_payment_methods(customer_profile_id);
-- Payment transactions log
CREATE TABLE IF NOT EXISTS payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  profile_id uuid REFERENCES profiles(id),
  order_id uuid REFERENCES orders(id),
  invoice_id uuid REFERENCES invoices(id),
  saved_payment_method_id uuid REFERENCES saved_payment_methods(id),
  
  -- Authorize.net transaction details
  transaction_id text, -- Authorize.net transaction ID
  auth_code text,
  avs_result_code text,
  cvv_result_code text,
  
  -- Transaction info
  transaction_type text NOT NULL, -- auth_capture, auth_only, capture, refund, void
  amount numeric(10,2) NOT NULL,
  currency text DEFAULT 'USD',
  
  -- Payment method used
  payment_method_type text, -- card, ach
  card_last_four text,
  card_type text,
  
  -- Status
  status text NOT NULL DEFAULT 'pending', -- pending, approved, declined, error, refunded, voided
  response_code text,
  response_message text,
  error_code text,
  error_message text,
  
  -- Raw response for debugging
  raw_response jsonb,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_transactions_profile ON payment_transactions(profile_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
-- RLS Policies
ALTER TABLE saved_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
-- Users can view their own saved payment methods
CREATE POLICY "Users can view own payment methods" ON saved_payment_methods
  FOR SELECT USING (auth.uid() = profile_id);
-- Users can insert their own payment methods
CREATE POLICY "Users can insert own payment methods" ON saved_payment_methods
  FOR INSERT WITH CHECK (auth.uid() = profile_id);
-- Users can update their own payment methods
CREATE POLICY "Users can update own payment methods" ON saved_payment_methods
  FOR UPDATE USING (auth.uid() = profile_id);
-- Users can delete their own payment methods
CREATE POLICY "Users can delete own payment methods" ON saved_payment_methods
  FOR DELETE USING (auth.uid() = profile_id);
-- Users can view their own transactions
CREATE POLICY "Users can view own transactions" ON payment_transactions
  FOR SELECT USING (auth.uid() = profile_id);
-- Service role can do everything (for server-side operations)
CREATE POLICY "Service role full access payment methods" ON saved_payment_methods
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access transactions" ON payment_transactions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
-- Admin can view all payment methods and transactions
CREATE POLICY "Admin can view all payment methods" ON saved_payment_methods
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.type = 'admin'
    )
  );
CREATE POLICY "Admin can view all transactions" ON payment_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.type = 'admin'
    )
  );
-- Function to ensure only one default payment method per user
CREATE OR REPLACE FUNCTION ensure_single_default_payment_method()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE saved_payment_methods 
    SET is_default = false 
    WHERE profile_id = NEW.profile_id 
    AND id != NEW.id 
    AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trigger_single_default_payment_method
  BEFORE INSERT OR UPDATE ON saved_payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_payment_method();

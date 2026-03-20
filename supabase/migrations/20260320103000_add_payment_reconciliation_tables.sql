CREATE TABLE IF NOT EXISTS bank_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deposit_date date NOT NULL,
  bank_account_name text NOT NULL,
  deposit_amount numeric(10,2) NOT NULL,
  reference_number text,
  status text NOT NULL DEFAULT 'unmatched',
  matched_batch_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_reconciliation_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_batch_id text NOT NULL UNIQUE,
  settlement_date date,
  gateway_amount numeric(10,2) NOT NULL DEFAULT 0,
  local_amount numeric(10,2) NOT NULL DEFAULT 0,
  transaction_count integer NOT NULL DEFAULT 0,
  bank_deposit_id uuid REFERENCES bank_deposits(id) ON DELETE SET NULL,
  bank_account_name text,
  bank_deposit_date date,
  bank_deposit_amount numeric(10,2),
  difference_amount numeric(10,2) NOT NULL DEFAULT 0,
  reconciliation_status text NOT NULL DEFAULT 'unmatched',
  notes text,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_deposits_status ON bank_deposits(status);
CREATE INDEX IF NOT EXISTS idx_bank_deposits_date ON bank_deposits(deposit_date);
CREATE INDEX IF NOT EXISTS idx_payment_reconciliation_batches_status ON payment_reconciliation_batches(reconciliation_status);
CREATE INDEX IF NOT EXISTS idx_payment_reconciliation_batches_settlement_date ON payment_reconciliation_batches(settlement_date);

ALTER TABLE bank_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reconciliation_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can view all bank deposits" ON bank_deposits;
CREATE POLICY "Admin can view all bank deposits" ON bank_deposits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.type = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admin can insert bank deposits" ON bank_deposits;
CREATE POLICY "Admin can insert bank deposits" ON bank_deposits
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.type = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admin can update bank deposits" ON bank_deposits;
CREATE POLICY "Admin can update bank deposits" ON bank_deposits
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.type = 'admin'
    )
  );

DROP POLICY IF EXISTS "Service role full access bank deposits" ON bank_deposits;
CREATE POLICY "Service role full access bank deposits" ON bank_deposits
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Admin can view all reconciliation batches" ON payment_reconciliation_batches;
CREATE POLICY "Admin can view all reconciliation batches" ON payment_reconciliation_batches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.type = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admin can insert reconciliation batches" ON payment_reconciliation_batches;
CREATE POLICY "Admin can insert reconciliation batches" ON payment_reconciliation_batches
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.type = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admin can update reconciliation batches" ON payment_reconciliation_batches;
CREATE POLICY "Admin can update reconciliation batches" ON payment_reconciliation_batches
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.type = 'admin'
    )
  );

DROP POLICY IF EXISTS "Service role full access reconciliation batches" ON payment_reconciliation_batches;
CREATE POLICY "Service role full access reconciliation batches" ON payment_reconciliation_batches
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

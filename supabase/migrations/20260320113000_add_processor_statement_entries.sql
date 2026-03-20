ALTER TABLE payment_reconciliation_batches
ADD COLUMN IF NOT EXISTS processor_statement_entry_id uuid,
ADD COLUMN IF NOT EXISTS processor_fee_amount numeric(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS expected_net_amount numeric(10,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS processor_statement_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_date date NOT NULL,
  bank_account_name text,
  batch_reference text,
  gross_amount numeric(10,2) NOT NULL,
  fee_amount numeric(10,2) NOT NULL DEFAULT 0,
  net_amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'unmatched',
  matched_batch_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE payment_reconciliation_batches
ADD CONSTRAINT payment_reconciliation_batches_processor_statement_entry_id_fkey
FOREIGN KEY (processor_statement_entry_id) REFERENCES processor_statement_entries(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_processor_statement_entries_status
ON processor_statement_entries(status);

CREATE INDEX IF NOT EXISTS idx_processor_statement_entries_statement_date
ON processor_statement_entries(statement_date);

ALTER TABLE processor_statement_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can view all processor statement entries" ON processor_statement_entries;
CREATE POLICY "Admin can view all processor statement entries" ON processor_statement_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.type = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admin can insert processor statement entries" ON processor_statement_entries;
CREATE POLICY "Admin can insert processor statement entries" ON processor_statement_entries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.type = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admin can update processor statement entries" ON processor_statement_entries;
CREATE POLICY "Admin can update processor statement entries" ON processor_statement_entries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.type = 'admin'
    )
  );

DROP POLICY IF EXISTS "Service role full access processor statement entries" ON processor_statement_entries;
CREATE POLICY "Service role full access processor statement entries" ON processor_statement_entries
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

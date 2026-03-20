ALTER TABLE payment_reconciliation_batches
ADD COLUMN IF NOT EXISTS payment_settings_profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS gateway_transaction_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS local_transaction_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS missing_local_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS missing_gateway_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS mismatch_category text,
ADD COLUMN IF NOT EXISTS gateway_status text,
ADD COLUMN IF NOT EXISTS gateway_reported_at timestamptz,
ADD COLUMN IF NOT EXISTS gateway_payload jsonb;

ALTER TABLE processor_statement_entries
ADD COLUMN IF NOT EXISTS matched_batch_uuid uuid REFERENCES payment_reconciliation_batches(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS mismatch_category text;

ALTER TABLE bank_deposits
ADD COLUMN IF NOT EXISTS matched_batch_uuid uuid REFERENCES payment_reconciliation_batches(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS mismatch_category text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_processor_statement_entries_matched_batch_uuid
ON processor_statement_entries(matched_batch_uuid)
WHERE matched_batch_uuid IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_deposits_matched_batch_uuid
ON bank_deposits(matched_batch_uuid)
WHERE matched_batch_uuid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_reconciliation_batches_mismatch_category
ON payment_reconciliation_batches(mismatch_category);

CREATE INDEX IF NOT EXISTS idx_payment_reconciliation_batches_payment_settings_profile_id
ON payment_reconciliation_batches(payment_settings_profile_id);

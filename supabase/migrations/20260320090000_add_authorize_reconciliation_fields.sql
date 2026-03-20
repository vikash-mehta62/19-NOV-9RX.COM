ALTER TABLE payment_transactions
ADD COLUMN IF NOT EXISTS gateway_transaction_status text,
ADD COLUMN IF NOT EXISTS gateway_batch_id text,
ADD COLUMN IF NOT EXISTS gateway_settlement_time timestamptz,
ADD COLUMN IF NOT EXISTS reconciliation_status text NOT NULL DEFAULT 'not_checked',
ADD COLUMN IF NOT EXISTS reconciliation_reason text,
ADD COLUMN IF NOT EXISTS reconciliation_last_checked_at timestamptz,
ADD COLUMN IF NOT EXISTS gateway_response jsonb;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_reconciliation_status
ON payment_transactions(reconciliation_status);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_transaction_id
ON payment_transactions(transaction_id)
WHERE transaction_id IS NOT NULL;

ALTER TABLE payment_transactions
ADD COLUMN IF NOT EXISTS processor text,
ADD COLUMN IF NOT EXISTS gateway_status_id integer,
ADD COLUMN IF NOT EXISTS gateway_last_checked_at timestamptz,
ADD COLUMN IF NOT EXISTS gateway_return_code text,
ADD COLUMN IF NOT EXISTS gateway_return_message text;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_processor
ON payment_transactions(processor);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_gateway_status_id
ON payment_transactions(gateway_status_id)
WHERE gateway_status_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_gateway_last_checked_at
ON payment_transactions(gateway_last_checked_at)
WHERE gateway_last_checked_at IS NOT NULL;

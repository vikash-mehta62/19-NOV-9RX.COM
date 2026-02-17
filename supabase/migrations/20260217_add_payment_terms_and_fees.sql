-- Add Payment Terms & Fees columns to settings table
-- These settings control late payment fees, processing fees, and payment terms

-- Payment Terms & Fees Settings
ALTER TABLE settings ADD COLUMN IF NOT EXISTS late_payment_enabled boolean DEFAULT false;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS late_payment_interest_rate numeric(5,2) DEFAULT 1.5;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS late_payment_grace_period_days integer DEFAULT 15;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS late_payment_fee_type text DEFAULT 'percentage';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS late_payment_fixed_fee numeric(10,2) DEFAULT 25;

-- Card Processing Fees
ALTER TABLE settings ADD COLUMN IF NOT EXISTS card_processing_fee_enabled boolean DEFAULT false;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS card_processing_fee_percentage numeric(5,2) DEFAULT 2.9;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS card_processing_fee_pass_to_customer boolean DEFAULT false;

-- ACH Processing Fees
ALTER TABLE settings ADD COLUMN IF NOT EXISTS ach_processing_fee_enabled boolean DEFAULT false;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS ach_processing_fee_amount numeric(10,2) DEFAULT 1.5;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS ach_processing_fee_pass_to_customer boolean DEFAULT false;

-- Payment Terms
ALTER TABLE settings ADD COLUMN IF NOT EXISTS minimum_payment_amount numeric(10,2) DEFAULT 0;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS payment_terms_text text DEFAULT 'Payment is due within 30 days of invoice date. Late payments may incur additional fees.';

-- Early Payment Discount
ALTER TABLE settings ADD COLUMN IF NOT EXISTS early_payment_discount_enabled boolean DEFAULT false;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS early_payment_discount_percentage numeric(5,2) DEFAULT 2;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS early_payment_discount_days integer DEFAULT 10;

-- Payment Processor Selection
ALTER TABLE settings ADD COLUMN IF NOT EXISTS credit_card_processor text DEFAULT 'authorize_net';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS ach_processor text DEFAULT 'authorize_net';

-- Add comments for documentation
COMMENT ON COLUMN settings.late_payment_enabled IS 'Enable late payment fees';
COMMENT ON COLUMN settings.late_payment_interest_rate IS 'Late payment interest rate percentage per month';
COMMENT ON COLUMN settings.late_payment_grace_period_days IS 'Grace period before late fees apply';
COMMENT ON COLUMN settings.late_payment_fee_type IS 'Type of late fee: percentage or fixed';
COMMENT ON COLUMN settings.late_payment_fixed_fee IS 'Fixed late payment fee amount';
COMMENT ON COLUMN settings.card_processing_fee_enabled IS 'Enable card processing fees';
COMMENT ON COLUMN settings.card_processing_fee_percentage IS 'Card processing fee percentage';
COMMENT ON COLUMN settings.card_processing_fee_pass_to_customer IS 'Pass card processing fee to customer';
COMMENT ON COLUMN settings.ach_processing_fee_enabled IS 'Enable ACH processing fees';
COMMENT ON COLUMN settings.ach_processing_fee_amount IS 'ACH processing fee flat amount';
COMMENT ON COLUMN settings.ach_processing_fee_pass_to_customer IS 'Pass ACH processing fee to customer';
COMMENT ON COLUMN settings.minimum_payment_amount IS 'Minimum payment amount required';
COMMENT ON COLUMN settings.payment_terms_text IS 'Payment terms text displayed on invoices';
COMMENT ON COLUMN settings.early_payment_discount_enabled IS 'Enable early payment discount';
COMMENT ON COLUMN settings.early_payment_discount_percentage IS 'Early payment discount percentage';
COMMENT ON COLUMN settings.early_payment_discount_days IS 'Days within which early payment discount applies';
COMMENT ON COLUMN settings.credit_card_processor IS 'Credit card payment processor (authorize_net or fortispay)';
COMMENT ON COLUMN settings.ach_processor IS 'ACH payment processor (authorize_net or fortispay)';

-- Add customer_profile_id column to saved_payment_methods table
-- This stores the Authorize.net Customer Profile ID for token-based payments

-- Add column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'saved_payment_methods' 
        AND column_name = 'customer_profile_id'
    ) THEN
        ALTER TABLE saved_payment_methods 
        ADD COLUMN customer_profile_id TEXT;
        
        COMMENT ON COLUMN saved_payment_methods.customer_profile_id IS 
            'Authorize.net Customer Profile ID for token-based payments';
    END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_saved_payment_methods_customer_profile 
ON saved_payment_methods(customer_profile_id) 
WHERE customer_profile_id IS NOT NULL;

-- Update existing records to mark them as legacy (no token-based payment)
-- Cards with payment_profile_id starting with 'local_' are legacy cards
UPDATE saved_payment_methods 
SET customer_profile_id = NULL 
WHERE payment_profile_id LIKE 'local_%' 
AND customer_profile_id IS NULL;

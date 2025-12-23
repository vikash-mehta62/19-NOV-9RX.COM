-- Add signature fields to credit_applications table
ALTER TABLE credit_applications 
ADD COLUMN IF NOT EXISTS signature TEXT,
ADD COLUMN IF NOT EXISTS signed_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS signed_title VARCHAR(255),
ADD COLUMN IF NOT EXISTS signed_date TIMESTAMP WITH TIME ZONE;
-- Add comment for documentation
COMMENT ON COLUMN credit_applications.signature IS 'Base64 encoded signature image';
COMMENT ON COLUMN credit_applications.signed_name IS 'Printed name of the signer';
COMMENT ON COLUMN credit_applications.signed_title IS 'Title/position of the signer';
COMMENT ON COLUMN credit_applications.signed_date IS 'Date when the application was signed';

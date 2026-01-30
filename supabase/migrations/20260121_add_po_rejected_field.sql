-- Add poRejected field to orders table to track PO rejection status
-- This ensures that once a PO is approved or rejected, it cannot be changed

-- Add poRejected column
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS "poRejected" BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN orders."poRejected" IS 'Indicates if a Purchase Order has been rejected. Once true, PO cannot be approved.';

-- Update existing records to ensure consistency
-- If poApproved is true, poRejected should be false
UPDATE orders 
SET "poRejected" = false 
WHERE "poApproved" = true AND "poRejected" IS NULL;

-- If poApproved is false or null, keep poRejected as false (default)
UPDATE orders 
SET "poRejected" = false 
WHERE "poRejected" IS NULL;

-- Add check constraint to ensure poApproved and poRejected are mutually exclusive
-- A PO cannot be both approved and rejected at the same time
ALTER TABLE orders 
ADD CONSTRAINT check_po_status_exclusive 
CHECK (
  NOT ("poApproved" = true AND "poRejected" = true)
);

COMMENT ON CONSTRAINT check_po_status_exclusive ON orders IS 'Ensures a PO cannot be both approved and rejected simultaneously';

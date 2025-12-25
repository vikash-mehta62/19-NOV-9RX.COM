-- Add discount columns to invoices table for verification
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS discount_amount numeric(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_details jsonb DEFAULT '[]'::jsonb;

-- Create index for discount_amount where discount exists
CREATE INDEX IF NOT EXISTS idx_invoices_discount_amount 
ON public.invoices (discount_amount) 
WHERE discount_amount > 0;

-- Comment for documentation
COMMENT ON COLUMN public.invoices.discount_amount IS 'Total discount amount applied to the invoice';
COMMENT ON COLUMN public.invoices.discount_details IS 'JSON array of discount details including name, type, amount, etc.';

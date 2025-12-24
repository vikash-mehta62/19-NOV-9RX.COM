-- Add columns to carts table for abandonment tracking
ALTER TABLE public.carts 
ADD COLUMN IF NOT EXISTS abandoned_email_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS recovery_status TEXT;

-- Create index for performance on abandonment queries
CREATE INDEX IF NOT EXISTS idx_carts_abandoned_email_sent_at ON public.carts(abandoned_email_sent_at);

-- Add tracking columns to carts table to handle abandonment flow directly
ALTER TABLE public.carts 
ADD COLUMN IF NOT EXISTS abandoned_email_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS recovery_status TEXT DEFAULT 'pending';

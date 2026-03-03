-- Add reminder_sent_count column to carts table
ALTER TABLE carts 
ADD COLUMN IF NOT EXISTS reminder_sent_count INTEGER DEFAULT 0;

-- Update existing carts that have abandoned_email_sent_at to have count of 1
UPDATE carts 
SET reminder_sent_count = 1 
WHERE abandoned_email_sent_at IS NOT NULL AND reminder_sent_count = 0;;

-- Add email_type column to email_queue table
-- Created: 2026-02-23

-- Add the email_type column
ALTER TABLE email_queue 
ADD COLUMN IF NOT EXISTS email_type CHARACTER VARYING;

-- Add check constraint for valid email types
ALTER TABLE email_queue 
ADD CONSTRAINT email_queue_email_type_check 
CHECK (email_type IN (
  'welcome',
  'abandoned_cart', 
  'order_confirmation',
  'order_shipped',
  'order_delivered',
  'promotional',
  'newsletter',
  'restock_reminder',
  'inactive_user',
  'product_spotlight',
  'feedback',
  'password_reset',
  'terms_acceptance',
  'automation',
  'custom'
));

-- Add comment for documentation
COMMENT ON COLUMN email_queue.email_type IS 'Type of email being sent (welcome, order_confirmation, promotional, etc.)';

-- Update existing records to have a default email_type based on context
UPDATE email_queue 
SET email_type = CASE 
  WHEN automation_id IS NOT NULL THEN 'automation'
  WHEN campaign_id IS NOT NULL THEN 'promotional'
  WHEN template_id IS NOT NULL THEN (
    SELECT template_type 
    FROM email_templates 
    WHERE id = email_queue.template_id 
    LIMIT 1
  )
  ELSE 'custom'
END
WHERE email_type IS NULL;;

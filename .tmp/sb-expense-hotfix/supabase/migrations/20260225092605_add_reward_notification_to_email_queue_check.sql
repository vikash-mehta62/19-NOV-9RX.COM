
-- Drop the existing check constraint
ALTER TABLE email_queue 
DROP CONSTRAINT IF EXISTS email_queue_email_type_check;

-- Add the updated check constraint with reward_notification included
ALTER TABLE email_queue 
ADD CONSTRAINT email_queue_email_type_check 
CHECK (
  email_type::text = ANY (
    ARRAY[
      'welcome'::character varying,
      'abandoned_cart'::character varying,
      'order_confirmation'::character varying,
      'order_shipped'::character varying,
      'order_delivered'::character varying,
      'promotional'::character varying,
      'newsletter'::character varying,
      'restock_reminder'::character varying,
      'inactive_user'::character varying,
      'product_spotlight'::character varying,
      'feedback'::character varying,
      'password_reset'::character varying,
      'terms_acceptance'::character varying,
      'automation'::character varying,
      'custom'::character varying,
      'reward_notification'::character varying
    ]::text[]
  )
);
;

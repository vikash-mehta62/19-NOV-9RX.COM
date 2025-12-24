-- Insert default abandoned cart automation if it doesn't exist
INSERT INTO public.email_automations (
    name,
    trigger_type,
    description,
    is_active,
    delay_hours, -- Legacy column, but good to set
    trigger_conditions,
    cooldown_days
)
SELECT 
    'Abandoned Cart Recovery',
    'abandoned_cart',
    'Send an email when a user leaves items in their cart for more than 1 hour.',
    true,
    1,
    '{"delay_hours": 1, "min_cart_value": 0}',
    1
WHERE NOT EXISTS (
    SELECT 1 FROM public.email_automations WHERE trigger_type = 'abandoned_cart'
);

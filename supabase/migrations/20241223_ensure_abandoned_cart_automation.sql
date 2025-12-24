-- Ensure abandoned cart automation exists
INSERT INTO public.email_automations (
    name,
    description,
    trigger_type,
    is_active,
    trigger_conditions,
    cooldown_days,
    priority
)
SELECT 
    'Abandoned Cart Recovery',
    'Send an email when a user abandons their cart',
    'abandoned_cart',
    true,
    '{"delay_hours": 24, "min_cart_value": 0}'::jsonb,
    1,
    10
WHERE NOT EXISTS (
    SELECT 1 FROM public.email_automations WHERE trigger_type = 'abandoned_cart'
);

-- Also ensure carts table has RLS enabled but accessible for now (already done in previous migration but good to be safe)
-- (Skipping as previous migration handled it)

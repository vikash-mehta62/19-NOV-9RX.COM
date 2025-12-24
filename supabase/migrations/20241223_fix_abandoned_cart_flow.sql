-- 1. Insert default abandoned cart automation
INSERT INTO public.email_automations (
    name,
    trigger_type,
    description,
    is_active,
    trigger_conditions,
    cooldown_days
)
SELECT 
    'Abandoned Cart Recovery',
    'abandoned_cart',
    'Send an email when a user leaves items in their cart for more than 1 hour.',
    true,
    '{"delay_hours": 1, "min_cart_value": 0}',
    1
WHERE NOT EXISTS (
    SELECT 1 FROM public.email_automations WHERE trigger_type = 'abandoned_cart'
);

-- 2. Enable RLS on carts if not already enabled
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;

-- 3. Add Policy: Admins can view ALL carts
DROP POLICY IF EXISTS "Admins can view all carts" ON public.carts;
CREATE POLICY "Admins can view all carts" ON public.carts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- 4. Add Policy: Admins can update ALL carts (to mark email as sent)
DROP POLICY IF EXISTS "Admins can update all carts" ON public.carts;
CREATE POLICY "Admins can update all carts" ON public.carts
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- 5. Add Policy: Users can view their own carts (Standard)
DROP POLICY IF EXISTS "Users can view own carts" ON public.carts;
CREATE POLICY "Users can view own carts" ON public.carts
    FOR SELECT
    USING (auth.uid() = user_id);

-- 6. Add Policy: Users can insert/update their own carts
DROP POLICY IF EXISTS "Users can manage own carts" ON public.carts;
CREATE POLICY "Users can manage own carts" ON public.carts
    FOR ALL
    USING (auth.uid() = user_id);

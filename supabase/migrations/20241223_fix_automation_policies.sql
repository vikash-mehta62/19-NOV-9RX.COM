-- Enable RLS on email_automations
ALTER TABLE public.email_automations ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read active automations (needed for client-side cron)
DROP POLICY IF EXISTS "Everyone can view active automations" ON public.email_automations;
CREATE POLICY "Everyone can view active automations" ON public.email_automations
    FOR SELECT
    USING (true); -- TEMPORARILY OPEN TO ALL FOR DEBUGGING

-- Enable RLS on carts (make sure it's enabled)
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;

-- Fix carts policies to allow system/anonymous read for abandoned cart checks
DROP POLICY IF EXISTS "System can view all carts" ON public.carts;
CREATE POLICY "System can view all carts" ON public.carts
    FOR SELECT
    USING (true); -- TEMPORARILY OPEN TO ALL FOR DEBUGGING

DROP POLICY IF EXISTS "System can update carts" ON public.carts;
CREATE POLICY "System can update carts" ON public.carts
    FOR UPDATE
    USING (true); -- TEMPORARILY OPEN TO ALL FOR DEBUGGING

-- Allow admins to do everything
DROP POLICY IF EXISTS "Admins can manage email_automations" ON public.email_automations;
CREATE POLICY "Admins can manage email_automations" ON public.email_automations
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- EMAIL QUEUE POLICIES
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can insert email_queue" ON public.email_queue;
CREATE POLICY "Everyone can insert email_queue" ON public.email_queue
    FOR INSERT
    WITH CHECK (true); -- TEMPORARILY OPEN FOR DEBUGGING

DROP POLICY IF EXISTS "Everyone can select email_queue" ON public.email_queue;
CREATE POLICY "Everyone can select email_queue" ON public.email_queue
    FOR SELECT
    USING (true); -- TEMPORARILY OPEN FOR DEBUGGING

-- PROFILES POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view profiles" ON public.profiles;
CREATE POLICY "Everyone can view profiles" ON public.profiles
    FOR SELECT
    USING (true); -- TEMPORARILY OPEN FOR DEBUGGING

-- EMAIL TEMPLATES POLICIES
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can insert email_templates" ON public.email_templates;
CREATE POLICY "Everyone can insert email_templates" ON public.email_templates
    FOR INSERT
    WITH CHECK (true); -- TEMPORARILY OPEN FOR DEBUGGING

DROP POLICY IF EXISTS "Everyone can select email_templates" ON public.email_templates;
CREATE POLICY "Everyone can select email_templates" ON public.email_templates
    FOR SELECT
    USING (true); -- TEMPORARILY OPEN FOR DEBUGGING

DROP POLICY IF EXISTS "Everyone can update email_automations" ON public.email_automations;
CREATE POLICY "Everyone can update email_automations" ON public.email_automations
    FOR UPDATE
    USING (true); -- TEMPORARILY OPEN FOR DEBUGGING

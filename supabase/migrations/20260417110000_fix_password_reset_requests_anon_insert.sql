-- Allow blocked pre-login users to log password reset requests.
-- These requests are created before authentication completes.

ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can log password reset requests"
ON public.password_reset_requests;

DROP POLICY IF EXISTS "Anon and authenticated users can log password reset requests"
ON public.password_reset_requests;

CREATE POLICY "Anon and authenticated users can log password reset requests"
ON public.password_reset_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

GRANT INSERT ON public.password_reset_requests TO anon;
GRANT INSERT ON public.password_reset_requests TO authenticated;

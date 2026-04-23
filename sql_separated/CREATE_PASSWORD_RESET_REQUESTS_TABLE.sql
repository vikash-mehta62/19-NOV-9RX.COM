-- =====================================================
-- PASSWORD RESET REQUESTS LOGGING TABLE
-- =====================================================
-- Purpose: Log password reset requests for admin visibility
-- Date: 2026-02-18
-- =====================================================

-- STEP 1: Create the password_reset_requests table
CREATE TABLE IF NOT EXISTS public.password_reset_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 2: Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_user_id 
ON public.password_reset_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_password_reset_requests_requested_at 
ON public.password_reset_requests(requested_at DESC);

-- STEP 3: Enable RLS
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

-- STEP 4: Create RLS policies
-- Admin can view all password reset requests
CREATE POLICY "Admins can view all password reset requests" 
ON public.password_reset_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Allow insert for authenticated users (for logging purposes)
CREATE POLICY "Authenticated users can log password reset requests" 
ON public.password_reset_requests
FOR INSERT
WITH CHECK (true);

-- STEP 5: Add comment to document the table
COMMENT ON TABLE public.password_reset_requests IS 
'Logs password reset requests from users who need to contact admin for password reset after migration';

-- STEP 6: Grant permissions
GRANT SELECT ON public.password_reset_requests TO authenticated;
GRANT INSERT ON public.password_reset_requests TO authenticated;
GRANT SELECT ON public.password_reset_requests TO anon;

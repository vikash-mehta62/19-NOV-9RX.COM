-- =====================================================
-- COMPLETE PASSWORD RESET MIGRATION
-- =====================================================
-- Purpose: Complete database setup for password reset after Supabase migration
-- Project: qiaetxkxweghuoxyhvml
-- Date: 2026-02-18
-- 
-- This script combines all database changes needed for the password reset feature.
-- Run this entire script in your Supabase SQL Editor.
-- =====================================================

-- =====================================================
-- PART 1: ADD PASSWORD RESET FLAG TO PROFILES
-- =====================================================

-- Step 1: Add the requires_password_reset column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS requires_password_reset BOOLEAN DEFAULT false;

-- Step 2: Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_requires_password_reset 
ON public.profiles(requires_password_reset) 
WHERE requires_password_reset = true;

-- Step 3: Set flag to TRUE for all existing users EXCEPT admin role
-- This is a ONE-TIME operation for the migration
UPDATE public.profiles
SET requires_password_reset = true
WHERE role != 'admin' 
  AND role IS NOT NULL
  AND requires_password_reset = false;

-- Step 4: Add comment to document the column
COMMENT ON COLUMN public.profiles.requires_password_reset IS 
'Flag to indicate if user needs password reset after Supabase project migration. Set to true for existing users (except admin), false for new users.';

-- =====================================================
-- PART 2: CREATE PASSWORD RESET REQUESTS LOGGING TABLE
-- =====================================================

-- Step 1: Create the password_reset_requests table
CREATE TABLE IF NOT EXISTS public.password_reset_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_user_id 
ON public.password_reset_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_password_reset_requests_requested_at 
ON public.password_reset_requests(requested_at DESC);

-- Step 3: Enable RLS
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies if they exist (for re-running script)
DROP POLICY IF EXISTS "Admins can view all password reset requests" ON public.password_reset_requests;
DROP POLICY IF EXISTS "Authenticated users can log password reset requests" ON public.password_reset_requests;

-- Step 5: Create RLS policies
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

-- Step 6: Add comment to document the table
COMMENT ON TABLE public.password_reset_requests IS 
'Logs password reset requests from users who need to contact admin for password reset after migration';

-- Step 7: Grant permissions
GRANT SELECT ON public.password_reset_requests TO authenticated;
GRANT INSERT ON public.password_reset_requests TO authenticated;
GRANT SELECT ON public.password_reset_requests TO anon;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check the migration results
SELECT 
    'Migration Summary' as report_section,
    '' as detail
UNION ALL
SELECT 
    '==================' as report_section,
    '' as detail
UNION ALL
SELECT 
    'Total users' as report_section,
    COUNT(*)::text as detail
FROM public.profiles
UNION ALL
SELECT 
    'Users requiring password reset' as report_section,
    COUNT(*)::text as detail
FROM public.profiles
WHERE requires_password_reset = true
UNION ALL
SELECT 
    'Admin users (excluded)' as report_section,
    COUNT(*)::text as detail
FROM public.profiles
WHERE role = 'admin'
UNION ALL
SELECT 
    'New users (can login)' as report_section,
    COUNT(*)::text as detail
FROM public.profiles
WHERE requires_password_reset = false
UNION ALL
SELECT 
    '' as report_section,
    '' as detail
UNION ALL
SELECT 
    'Password reset requests table' as report_section,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'password_reset_requests') 
         THEN '✅ Created' 
         ELSE '❌ Not found' 
    END as detail
UNION ALL
SELECT 
    'RLS enabled on password_reset_requests' as report_section,
    CASE WHEN rowsecurity THEN '✅ YES' ELSE '❌ NO' END as detail
FROM pg_tables 
WHERE tablename = 'password_reset_requests' AND schemaname = 'public';

-- =====================================================
-- USEFUL ADMIN QUERIES
-- =====================================================

-- View all users who need password reset
-- SELECT email, first_name, last_name, role, requires_password_reset 
-- FROM profiles 
-- WHERE requires_password_reset = true
-- ORDER BY email;

-- View password reset request log
-- SELECT pr.email, pr.requested_at, p.first_name, p.last_name, p.role
-- FROM password_reset_requests pr
-- JOIN profiles p ON pr.user_id = p.id
-- ORDER BY pr.requested_at DESC
-- LIMIT 50;

-- Clear password reset flag for a specific user (after resetting their password)
-- UPDATE profiles 
-- SET requires_password_reset = false 
-- WHERE email = 'user@example.com';

-- Count statistics
-- SELECT 
--   COUNT(*) FILTER (WHERE requires_password_reset = true) as needs_reset,
--   COUNT(*) FILTER (WHERE requires_password_reset = false) as can_login,
--   COUNT(*) as total
-- FROM profiles;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Next steps:
-- 1. Deploy frontend changes
-- 2. Test with existing user (should see popup)
-- 3. Test with new user (should login normally)
-- 4. Test with admin (should login normally)
-- 5. Check admin Users page for password reset requests
-- =====================================================

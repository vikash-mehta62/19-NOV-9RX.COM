-- =====================================================
-- PASSWORD RESET FLAG MIGRATION
-- =====================================================
-- Purpose: Add a flag to track users who need password reset after Supabase project migration
-- Date: 2026-02-18
-- Project: qiaetxkxweghuoxyhvml (new Supabase project)
-- =====================================================

-- STEP 1: Add the requires_password_reset column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS requires_password_reset BOOLEAN DEFAULT false;

-- STEP 2: Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_requires_password_reset 
ON public.profiles(requires_password_reset) 
WHERE requires_password_reset = true;

-- STEP 3: Set flag to TRUE for all existing users EXCEPT admin role
-- This is a ONE-TIME operation for the migration
UPDATE public.profiles
SET requires_password_reset = true
WHERE role != 'admin' 
  AND role IS NOT NULL
  AND requires_password_reset = false;

-- STEP 4: Add comment to document the column
COMMENT ON COLUMN public.profiles.requires_password_reset IS 
'Flag to indicate if user needs password reset after Supabase project migration. Set to true for existing users (except admin), false for new users.';

-- STEP 5: Verify the changes
SELECT 
    'Total users' as category,
    COUNT(*) as count
FROM public.profiles
UNION ALL
SELECT 
    'Users requiring password reset' as category,
    COUNT(*) as count
FROM public.profiles
WHERE requires_password_reset = true
UNION ALL
SELECT 
    'Admin users (excluded)' as category,
    COUNT(*) as count
FROM public.profiles
WHERE role = 'admin';

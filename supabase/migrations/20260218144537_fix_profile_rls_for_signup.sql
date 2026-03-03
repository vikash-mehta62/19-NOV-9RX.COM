-- =====================================================
-- FIX PROFILE RLS FOR SIGNUP
-- =====================================================
-- Purpose: Allow profile creation during signup process
-- Issue: RLS blocking profile insertion during signup
-- =====================================================

-- Drop existing INSERT policy
DROP POLICY IF EXISTS profiles_insert_policy ON public.profiles;

-- Create new INSERT policy that allows signup
CREATE POLICY profiles_insert_policy ON public.profiles
  FOR INSERT
  WITH CHECK (
    -- Allow service role (system operations)
    auth.role() = 'service_role'
    OR
    -- Allow anon role (signup process via SECURITY DEFINER function)
    auth.role() = 'anon'
    OR
    -- Allow authenticated user to insert their own profile
    (auth.role() = 'authenticated' AND auth.uid() = id)
    OR
    -- Allow admin users to insert any profile
    (auth.role() = 'authenticated' AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'superadmin')
    ))
  );

-- Update handle_new_user function to include requires_password_reset
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        first_name,
        last_name,
        display_name,
        mobile_phone,
        work_phone,
        status,
        type,
        role,
        requires_password_reset,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        COALESCE(
            NEW.raw_user_meta_data->>'first_name' || ' ' || NEW.raw_user_meta_data->>'last_name',
            NEW.email
        ),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        'pending',
        COALESCE(NEW.raw_user_meta_data->>'type', 'pharmacy'),
        'user',
        false, -- New users don't need password reset
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Verify the policy
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles' 
  AND policyname = 'profiles_insert_policy';

COMMENT ON POLICY profiles_insert_policy ON public.profiles IS 
'Allows profile creation during signup (anon role via SECURITY DEFINER function), by authenticated users for themselves, and by admins for anyone';;

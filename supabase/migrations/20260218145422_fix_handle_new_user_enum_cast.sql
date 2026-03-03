-- =====================================================
-- FIX HANDLE_NEW_USER FUNCTION - ENUM TYPE CASTING
-- =====================================================
-- Purpose: Fix "column type is of type user_type but expression is of type text" error
-- Issue: Need to cast text to user_type enum
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_first_name text;
    v_last_name text;
    v_phone text;
    v_type user_type; -- Changed to user_type enum
    v_display_name text;
BEGIN
    -- Safely extract values from raw_user_meta_data
    v_first_name := COALESCE((NEW.raw_user_meta_data->>'first_name')::text, '');
    v_last_name := COALESCE((NEW.raw_user_meta_data->>'last_name')::text, '');
    v_phone := COALESCE((NEW.raw_user_meta_data->>'phone')::text, '');
    
    -- Cast to user_type enum with default 'pharmacy'
    v_type := COALESCE((NEW.raw_user_meta_data->>'type')::user_type, 'pharmacy'::user_type);
    
    -- Build display name
    IF v_first_name != '' AND v_last_name != '' THEN
        v_display_name := v_first_name || ' ' || v_last_name;
    ELSIF v_first_name != '' THEN
        v_display_name := v_first_name;
    ELSE
        v_display_name := NEW.email;
    END IF;

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
        v_first_name,
        v_last_name,
        v_display_name,
        v_phone,
        v_phone,
        'pending',
        v_type, -- Now properly typed as user_type enum
        'user',
        false, -- New users don't need password reset
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Verify function was updated
SELECT 
  'Function Updated' as status,
  proname as function_name,
  prosecdef as is_security_definer
FROM pg_proc
WHERE proname = 'handle_new_user';;

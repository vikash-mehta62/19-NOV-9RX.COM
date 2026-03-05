-- Ensure signup-created profiles persist Terms and Privacy JSONB even when
-- Supabase signUp returns no immediate session (email confirmation required).
-- Source data comes from auth.users.raw_user_meta_data.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_first_name text;
    v_last_name text;
    v_phone text;
    v_type user_type;
    v_display_name text;
    v_terms_accepted boolean := false;
    v_terms_accepted_at timestamptz;
    v_terms_version text := '1.0';
    v_terms_method text := 'web_form';
    v_terms_json jsonb;
    v_privacy_json jsonb;
BEGIN
    v_first_name := COALESCE((NEW.raw_user_meta_data->>'first_name')::text, '');
    v_last_name := COALESCE((NEW.raw_user_meta_data->>'last_name')::text, '');
    v_phone := COALESCE((NEW.raw_user_meta_data->>'phone')::text, '');
    v_type := COALESCE((NEW.raw_user_meta_data->>'type')::user_type, 'pharmacy'::user_type);

    v_terms_accepted := COALESCE((NEW.raw_user_meta_data->>'terms_accepted')::boolean, false);
    v_terms_version := COALESCE(NULLIF((NEW.raw_user_meta_data->>'terms_version')::text, ''), '1.0');
    v_terms_method := COALESCE(NULLIF((NEW.raw_user_meta_data->>'signup_source')::text, ''), 'web_form');

    BEGIN
        v_terms_accepted_at := NULLIF((NEW.raw_user_meta_data->>'terms_accepted_at')::text, '')::timestamptz;
    EXCEPTION WHEN others THEN
        v_terms_accepted_at := NULL;
    END;

    IF v_terms_accepted AND v_terms_accepted_at IS NULL THEN
        v_terms_accepted_at := NOW();
    END IF;

    IF v_first_name <> '' AND v_last_name <> '' THEN
        v_display_name := v_first_name || ' ' || v_last_name;
    ELSIF v_first_name <> '' THEN
        v_display_name := v_first_name;
    ELSE
        v_display_name := NEW.email;
    END IF;

    v_terms_json := CASE
        WHEN v_terms_accepted THEN
            jsonb_build_object(
                'accepted', true,
                'acceptedAt', v_terms_accepted_at,
                'version', v_terms_version,
                'method', v_terms_method,
                'signature', NULL,
                'signatureMethod', NULL
            )
        ELSE NULL
    END;

    v_privacy_json := CASE
        WHEN v_terms_accepted THEN
            jsonb_build_object(
                'accepted', true,
                'acceptedAt', v_terms_accepted_at,
                'version', v_terms_version,
                'method', v_terms_method,
                'signature', NULL,
                'signatureMethod', NULL
            )
        ELSE NULL
    END;

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
        terms_and_conditions,
        privacy_policy,
        terms_accepted_at,
        privacy_policy_accepted_at,
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
        v_type,
        'user',
        false,
        v_terms_json,
        v_privacy_json,
        CASE WHEN v_terms_accepted THEN v_terms_accepted_at ELSE NULL END,
        CASE WHEN v_terms_accepted THEN v_terms_accepted_at ELSE NULL END,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), profiles.first_name),
        last_name = COALESCE(NULLIF(EXCLUDED.last_name, ''), profiles.last_name),
        display_name = COALESCE(NULLIF(EXCLUDED.display_name, ''), profiles.display_name),
        mobile_phone = COALESCE(NULLIF(EXCLUDED.mobile_phone, ''), profiles.mobile_phone),
        work_phone = COALESCE(NULLIF(EXCLUDED.work_phone, ''), profiles.work_phone),
        terms_and_conditions = COALESCE(EXCLUDED.terms_and_conditions, profiles.terms_and_conditions),
        privacy_policy = COALESCE(EXCLUDED.privacy_policy, profiles.privacy_policy),
        terms_accepted_at = COALESCE(EXCLUDED.terms_accepted_at, profiles.terms_accepted_at),
        privacy_policy_accepted_at = COALESCE(EXCLUDED.privacy_policy_accepted_at, profiles.privacy_policy_accepted_at),
        updated_at = NOW();

    RETURN NEW;
EXCEPTION WHEN others THEN
    RAISE WARNING 'handle_new_user: Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Hotfix: restore authenticated access to public.settings for self/admin.
-- Context:
-- - Global RLS hardening removed legacy TO public policies.
-- - Admin Settings page now fails initial row creation with:
--   "new row violates row-level security policy for table settings" (42501).
--
-- This migration:
-- 1) ensures RLS + grants for authenticated
-- 2) adds explicit authenticated policies for self/admin read/insert/update

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.role IN ('admin', 'superadmin') OR p.type::text = 'admin')
  );
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.settings') IS NOT NULL THEN
    ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
    GRANT SELECT, INSERT, UPDATE ON TABLE public.settings TO authenticated;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'settings'
        AND policyname = 'settings_self_or_admin_select'
    ) THEN
      CREATE POLICY settings_self_or_admin_select
      ON public.settings
      FOR SELECT
      TO authenticated
      USING (profile_id = auth.uid() OR public.current_user_is_admin());
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'settings'
        AND policyname = 'settings_self_or_admin_insert'
    ) THEN
      CREATE POLICY settings_self_or_admin_insert
      ON public.settings
      FOR INSERT
      TO authenticated
      WITH CHECK (profile_id = auth.uid() OR public.current_user_is_admin());
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'settings'
        AND policyname = 'settings_self_or_admin_update'
    ) THEN
      CREATE POLICY settings_self_or_admin_update
      ON public.settings
      FOR UPDATE
      TO authenticated
      USING (profile_id = auth.uid() OR public.current_user_is_admin())
      WITH CHECK (profile_id = auth.uid() OR public.current_user_is_admin());
    END IF;
  ELSE
    RAISE NOTICE 'public.settings does not exist, skipping settings RLS hotfix.';
  END IF;
END $$;

-- Ensure PostgREST sees policy changes immediately.
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE 'settings self/admin RLS hotfix applied';
END $$;

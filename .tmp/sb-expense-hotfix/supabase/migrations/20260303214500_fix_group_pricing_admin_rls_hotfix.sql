-- Hotfix: ensure admins can manage special pricing rules in public.group_pricing.
-- This is additive: it does not remove existing non-admin policies.

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
  IF to_regclass('public.group_pricing') IS NOT NULL THEN
    ALTER TABLE public.group_pricing ENABLE ROW LEVEL SECURITY;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.group_pricing TO authenticated;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'group_pricing'
        AND policyname = 'group_pricing_admin_select'
    ) THEN
      CREATE POLICY group_pricing_admin_select
      ON public.group_pricing
      FOR SELECT
      TO authenticated
      USING (public.current_user_is_admin());
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'group_pricing'
        AND policyname = 'group_pricing_admin_insert'
    ) THEN
      CREATE POLICY group_pricing_admin_insert
      ON public.group_pricing
      FOR INSERT
      TO authenticated
      WITH CHECK (public.current_user_is_admin());
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'group_pricing'
        AND policyname = 'group_pricing_admin_update'
    ) THEN
      CREATE POLICY group_pricing_admin_update
      ON public.group_pricing
      FOR UPDATE
      TO authenticated
      USING (public.current_user_is_admin())
      WITH CHECK (public.current_user_is_admin());
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'group_pricing'
        AND policyname = 'group_pricing_admin_delete'
    ) THEN
      CREATE POLICY group_pricing_admin_delete
      ON public.group_pricing
      FOR DELETE
      TO authenticated
      USING (public.current_user_is_admin());
    END IF;
  ELSE
    RAISE NOTICE 'public.group_pricing does not exist, skipping group pricing admin RLS hotfix.';
  END IF;
END $$;

-- Ensure PostgREST sees policy updates immediately.
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE 'group_pricing admin RLS hotfix applied';
END $$;

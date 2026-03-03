-- Hotfix: restore admin access to centerize_data for invoice/order prefix settings.
-- Context:
-- - After global RLS hardening, admin Settings > Invoices reads no rows.
-- - centerize_data row still exists, but admin SELECT/UPDATE is blocked by RLS.

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
  IF to_regclass('public.centerize_data') IS NOT NULL THEN
    ALTER TABLE public.centerize_data ENABLE ROW LEVEL SECURITY;
    GRANT SELECT, INSERT, UPDATE ON TABLE public.centerize_data TO authenticated;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'centerize_data'
        AND policyname = 'centerize_data_admin_select'
    ) THEN
      CREATE POLICY centerize_data_admin_select
      ON public.centerize_data
      FOR SELECT
      TO authenticated
      USING (public.current_user_is_admin());
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'centerize_data'
        AND policyname = 'centerize_data_admin_insert'
    ) THEN
      CREATE POLICY centerize_data_admin_insert
      ON public.centerize_data
      FOR INSERT
      TO authenticated
      WITH CHECK (public.current_user_is_admin());
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'centerize_data'
        AND policyname = 'centerize_data_admin_update'
    ) THEN
      CREATE POLICY centerize_data_admin_update
      ON public.centerize_data
      FOR UPDATE
      TO authenticated
      USING (public.current_user_is_admin())
      WITH CHECK (public.current_user_is_admin());
    END IF;
  ELSE
    RAISE NOTICE 'public.centerize_data does not exist, skipping admin RLS hotfix.';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE 'centerize_data admin RLS hotfix applied';
END $$;

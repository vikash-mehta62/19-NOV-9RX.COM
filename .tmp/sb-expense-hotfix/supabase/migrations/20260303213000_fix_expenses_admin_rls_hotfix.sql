-- Hotfix: restore admin access to public.expenses after security lockdown migrations.
-- This keeps expenses admin-only for authenticated users.

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
DECLARE
  p RECORD;
BEGIN
  IF to_regclass('public.expenses') IS NOT NULL THEN
    ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.expenses TO authenticated;

    FOR p IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'expenses'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.expenses', p.policyname);
    END LOOP;

    CREATE POLICY expenses_admin_select
    ON public.expenses
    FOR SELECT
    TO authenticated
    USING (public.current_user_is_admin());

    CREATE POLICY expenses_admin_insert
    ON public.expenses
    FOR INSERT
    TO authenticated
    WITH CHECK (public.current_user_is_admin());

    CREATE POLICY expenses_admin_update
    ON public.expenses
    FOR UPDATE
    TO authenticated
    USING (public.current_user_is_admin())
    WITH CHECK (public.current_user_is_admin());

    CREATE POLICY expenses_admin_delete
    ON public.expenses
    FOR DELETE
    TO authenticated
    USING (public.current_user_is_admin());
  ELSE
    RAISE NOTICE 'public.expenses does not exist, skipping expenses RLS hotfix.';
  END IF;
END $$;

-- Ensure PostgREST sees policy updates immediately.
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE 'expenses admin RLS hotfix applied';
END $$;

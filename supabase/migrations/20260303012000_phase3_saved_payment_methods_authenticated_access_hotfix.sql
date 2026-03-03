-- Phase 3i Hotfix: restore authenticated access for saved payment methods.
-- Why:
-- - Legacy policies were created with default role PUBLIC.
-- - Phase 3 lockdown removed anon/public policies globally.
-- - This left saved_payment_methods inserts failing with RLS violations.
-- Safe to run multiple times.

-- Ensure helper exists in environments where phase helpers were not applied.
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $admin_fn$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.role IN ('admin', 'superadmin')
        OR lower(COALESCE(p.role, '')) LIKE '%admin%'
        OR lower(COALESCE(p.type::text, '')) LIKE '%admin%'
      )
  );
END;
$admin_fn$;

DO $$
DECLARE
  p RECORD;
BEGIN
  IF to_regclass('public.saved_payment_methods') IS NULL THEN
    RAISE NOTICE 'saved_payment_methods table not found; skipping phase 3i hotfix.';
    RETURN;
  END IF;

  ALTER TABLE public.saved_payment_methods ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON TABLE public.saved_payment_methods FROM anon;
  REVOKE ALL ON TABLE public.saved_payment_methods FROM PUBLIC;
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.saved_payment_methods TO authenticated;

  -- Clean baseline: remove all existing policies to avoid stale PUBLIC-role policies.
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saved_payment_methods'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.saved_payment_methods', p.policyname);
  END LOOP;

  -- Authenticated users can see their own active/inactive methods; admins can see all.
  CREATE POLICY saved_payment_methods_select_self_or_admin
  ON public.saved_payment_methods
  FOR SELECT
  TO authenticated
  USING (
    profile_id = auth.uid()
    OR public.current_user_is_admin()
  );

  -- Authenticated users can insert for themselves; admins can insert for any profile.
  CREATE POLICY saved_payment_methods_insert_self_or_admin
  ON public.saved_payment_methods
  FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    OR public.current_user_is_admin()
  );

  -- Updates required for:
  -- - setting default method
  -- - soft delete (is_active = false)
  -- - trigger ensure_single_default_payment_method
  CREATE POLICY saved_payment_methods_update_self_or_admin
  ON public.saved_payment_methods
  FOR UPDATE
  TO authenticated
  USING (
    profile_id = auth.uid()
    OR public.current_user_is_admin()
  )
  WITH CHECK (
    profile_id = auth.uid()
    OR public.current_user_is_admin()
  );

  -- Hard delete allowed for owner/admin (if used).
  CREATE POLICY saved_payment_methods_delete_self_or_admin
  ON public.saved_payment_methods
  FOR DELETE
  TO authenticated
  USING (
    profile_id = auth.uid()
    OR public.current_user_is_admin()
  );
END $$;

-- Keep payment_transactions consistent too (same legacy PUBLIC-policy risk).
DO $$
DECLARE
  p RECORD;
BEGIN
  IF to_regclass('public.payment_transactions') IS NULL THEN
    RAISE NOTICE 'payment_transactions table not found; skipping phase 3i secondary hotfix.';
    RETURN;
  END IF;

  ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON TABLE public.payment_transactions FROM anon;
  REVOKE ALL ON TABLE public.payment_transactions FROM PUBLIC;
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.payment_transactions TO authenticated;

  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'payment_transactions'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.payment_transactions', p.policyname);
  END LOOP;

  CREATE POLICY payment_transactions_select_self_or_admin
  ON public.payment_transactions
  FOR SELECT
  TO authenticated
  USING (
    profile_id = auth.uid()
    OR public.current_user_is_admin()
  );

  CREATE POLICY payment_transactions_insert_self_or_admin
  ON public.payment_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    OR public.current_user_is_admin()
  );

  CREATE POLICY payment_transactions_update_admin_only
  ON public.payment_transactions
  FOR UPDATE
  TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

  CREATE POLICY payment_transactions_delete_admin_only
  ON public.payment_transactions
  FOR DELETE
  TO authenticated
  USING (public.current_user_is_admin());
END $$;

DO $$
BEGIN
  RAISE NOTICE 'Phase 3i saved_payment_methods/payment_transactions hotfix applied successfully.';
END $$;

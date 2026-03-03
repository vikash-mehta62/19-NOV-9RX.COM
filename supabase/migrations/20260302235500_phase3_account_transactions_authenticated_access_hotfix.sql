-- Phase 3f Hotfix: restore authenticated access to account_transactions.
-- Why: credit history UI reads account_transactions; after phase 3 cleanup,
-- historical TO public policies were removed and authenticated users can lose
-- self/admin visibility depending on prior grants/policies.
-- Safe to run multiple times.

DO $$
BEGIN
  IF to_regclass('public.account_transactions') IS NOT NULL THEN
    ALTER TABLE public.account_transactions ENABLE ROW LEVEL SECURITY;

    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.account_transactions TO authenticated;

    DROP POLICY IF EXISTS account_transactions_self_or_admin_select ON public.account_transactions;
    CREATE POLICY account_transactions_self_or_admin_select
    ON public.account_transactions
    FOR SELECT
    TO authenticated
    USING (
      customer_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND (p.role IN ('admin', 'superadmin') OR p.type::text = 'admin')
      )
    );

    DROP POLICY IF EXISTS account_transactions_self_or_admin_insert ON public.account_transactions;
    CREATE POLICY account_transactions_self_or_admin_insert
    ON public.account_transactions
    FOR INSERT
    TO authenticated
    WITH CHECK (
      customer_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND (p.role IN ('admin', 'superadmin') OR p.type::text = 'admin')
      )
    );

    DROP POLICY IF EXISTS account_transactions_admin_update ON public.account_transactions;
    CREATE POLICY account_transactions_admin_update
    ON public.account_transactions
    FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND (p.role IN ('admin', 'superadmin') OR p.type::text = 'admin')
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND (p.role IN ('admin', 'superadmin') OR p.type::text = 'admin')
      )
    );

    DROP POLICY IF EXISTS account_transactions_admin_delete ON public.account_transactions;
    CREATE POLICY account_transactions_admin_delete
    ON public.account_transactions
    FOR DELETE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND (p.role IN ('admin', 'superadmin') OR p.type::text = 'admin')
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE 'Phase 3f account_transactions authenticated-access hotfix applied successfully.';
END $$;

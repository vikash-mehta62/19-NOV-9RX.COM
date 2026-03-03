-- Phase 3e Hotfix: restore authenticated access for Credit module tables/RPC.
-- Why: phase 3 removed legacy TO public policies, which broke credit reads/writes
-- for authenticated pharmacy/admin users.
-- Safe to run multiple times.

DO $$
BEGIN
  -- -------------------------------------------------------------------------
  -- credit_applications
  -- -------------------------------------------------------------------------
  IF to_regclass('public.credit_applications') IS NOT NULL THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.credit_applications TO authenticated;

    DROP POLICY IF EXISTS credit_applications_self_read ON public.credit_applications;
    CREATE POLICY credit_applications_self_read
    ON public.credit_applications
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR public.current_user_is_admin());

    DROP POLICY IF EXISTS credit_applications_self_insert ON public.credit_applications;
    CREATE POLICY credit_applications_self_insert
    ON public.credit_applications
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id OR public.current_user_is_admin());

    DROP POLICY IF EXISTS credit_applications_admin_manage ON public.credit_applications;
    CREATE POLICY credit_applications_admin_manage
    ON public.credit_applications
    FOR UPDATE
    TO authenticated
    USING (public.current_user_is_admin())
    WITH CHECK (public.current_user_is_admin());

    DROP POLICY IF EXISTS credit_applications_admin_delete ON public.credit_applications;
    CREATE POLICY credit_applications_admin_delete
    ON public.credit_applications
    FOR DELETE
    TO authenticated
    USING (public.current_user_is_admin());
  END IF;

  -- -------------------------------------------------------------------------
  -- user_credit_lines
  -- -------------------------------------------------------------------------
  IF to_regclass('public.user_credit_lines') IS NOT NULL THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_credit_lines TO authenticated;

    DROP POLICY IF EXISTS user_credit_lines_self_or_admin_read ON public.user_credit_lines;
    CREATE POLICY user_credit_lines_self_or_admin_read
    ON public.user_credit_lines
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR public.current_user_is_admin());

    DROP POLICY IF EXISTS user_credit_lines_admin_manage ON public.user_credit_lines;
    CREATE POLICY user_credit_lines_admin_manage
    ON public.user_credit_lines
    FOR ALL
    TO authenticated
    USING (public.current_user_is_admin())
    WITH CHECK (public.current_user_is_admin());
  END IF;

  -- -------------------------------------------------------------------------
  -- credit_invoices
  -- -------------------------------------------------------------------------
  IF to_regclass('public.credit_invoices') IS NOT NULL THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.credit_invoices TO authenticated;

    DROP POLICY IF EXISTS credit_invoices_self_or_admin_read ON public.credit_invoices;
    CREATE POLICY credit_invoices_self_or_admin_read
    ON public.credit_invoices
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR public.current_user_is_admin());

    DROP POLICY IF EXISTS credit_invoices_admin_manage ON public.credit_invoices;
    CREATE POLICY credit_invoices_admin_manage
    ON public.credit_invoices
    FOR ALL
    TO authenticated
    USING (public.current_user_is_admin())
    WITH CHECK (public.current_user_is_admin());
  END IF;

  -- -------------------------------------------------------------------------
  -- credit_payments
  -- -------------------------------------------------------------------------
  IF to_regclass('public.credit_payments') IS NOT NULL THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.credit_payments TO authenticated;

    DROP POLICY IF EXISTS credit_payments_self_or_admin_read ON public.credit_payments;
    CREATE POLICY credit_payments_self_or_admin_read
    ON public.credit_payments
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR public.current_user_is_admin());

    DROP POLICY IF EXISTS credit_payments_admin_manage ON public.credit_payments;
    CREATE POLICY credit_payments_admin_manage
    ON public.credit_payments
    FOR ALL
    TO authenticated
    USING (public.current_user_is_admin())
    WITH CHECK (public.current_user_is_admin());
  END IF;

  -- -------------------------------------------------------------------------
  -- credit_terms
  -- -------------------------------------------------------------------------
  IF to_regclass('public.credit_terms') IS NOT NULL THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.credit_terms TO authenticated;

    DROP POLICY IF EXISTS credit_terms_authenticated_read ON public.credit_terms;
    CREATE POLICY credit_terms_authenticated_read
    ON public.credit_terms
    FOR SELECT
    TO authenticated
    USING (COALESCE(is_active, true) = true OR public.current_user_is_admin());

    DROP POLICY IF EXISTS credit_terms_admin_manage ON public.credit_terms;
    CREATE POLICY credit_terms_admin_manage
    ON public.credit_terms
    FOR ALL
    TO authenticated
    USING (public.current_user_is_admin())
    WITH CHECK (public.current_user_is_admin());
  END IF;

  -- -------------------------------------------------------------------------
  -- credit_penalty_history
  -- -------------------------------------------------------------------------
  IF to_regclass('public.credit_penalty_history') IS NOT NULL THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.credit_penalty_history TO authenticated;

    DROP POLICY IF EXISTS credit_penalty_history_self_or_admin_read ON public.credit_penalty_history;
    CREATE POLICY credit_penalty_history_self_or_admin_read
    ON public.credit_penalty_history
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR public.current_user_is_admin());

    DROP POLICY IF EXISTS credit_penalty_history_admin_manage ON public.credit_penalty_history;
    CREATE POLICY credit_penalty_history_admin_manage
    ON public.credit_penalty_history
    FOR ALL
    TO authenticated
    USING (public.current_user_is_admin())
    WITH CHECK (public.current_user_is_admin());
  END IF;

  -- -------------------------------------------------------------------------
  -- sent_credit_terms
  -- -------------------------------------------------------------------------
  IF to_regclass('public.sent_credit_terms') IS NOT NULL THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sent_credit_terms TO authenticated;

    DROP POLICY IF EXISTS sent_credit_terms_self_or_admin_read ON public.sent_credit_terms;
    CREATE POLICY sent_credit_terms_self_or_admin_read
    ON public.sent_credit_terms
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR public.current_user_is_admin());

    DROP POLICY IF EXISTS sent_credit_terms_self_update ON public.sent_credit_terms;
    CREATE POLICY sent_credit_terms_self_update
    ON public.sent_credit_terms
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id OR public.current_user_is_admin())
    WITH CHECK (auth.uid() = user_id OR public.current_user_is_admin());

    DROP POLICY IF EXISTS sent_credit_terms_admin_insert ON public.sent_credit_terms;
    CREATE POLICY sent_credit_terms_admin_insert
    ON public.sent_credit_terms
    FOR INSERT
    TO authenticated
    WITH CHECK (public.current_user_is_admin());

    DROP POLICY IF EXISTS sent_credit_terms_admin_delete ON public.sent_credit_terms;
    CREATE POLICY sent_credit_terms_admin_delete
    ON public.sent_credit_terms
    FOR DELETE
    TO authenticated
    USING (public.current_user_is_admin());
  END IF;

  -- -------------------------------------------------------------------------
  -- credit_memos / credit_memo_applications (used in pharmacy credit tab)
  -- -------------------------------------------------------------------------
  IF to_regclass('public.credit_memos') IS NOT NULL THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.credit_memos TO authenticated;

    DROP POLICY IF EXISTS credit_memos_customer_or_admin_read ON public.credit_memos;
    CREATE POLICY credit_memos_customer_or_admin_read
    ON public.credit_memos
    FOR SELECT
    TO authenticated
    USING (auth.uid() = customer_id OR public.current_user_is_admin());

    DROP POLICY IF EXISTS credit_memos_admin_manage ON public.credit_memos;
    CREATE POLICY credit_memos_admin_manage
    ON public.credit_memos
    FOR ALL
    TO authenticated
    USING (public.current_user_is_admin())
    WITH CHECK (public.current_user_is_admin());
  END IF;

  IF to_regclass('public.credit_memo_applications') IS NOT NULL THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.credit_memo_applications TO authenticated;

    DROP POLICY IF EXISTS credit_memo_apps_customer_or_admin_read ON public.credit_memo_applications;
    CREATE POLICY credit_memo_apps_customer_or_admin_read
    ON public.credit_memo_applications
    FOR SELECT
    TO authenticated
    USING (
      public.current_user_is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.credit_memos cm
        WHERE cm.id = credit_memo_applications.credit_memo_id
          AND cm.customer_id = auth.uid()
      )
    );

    DROP POLICY IF EXISTS credit_memo_apps_admin_manage ON public.credit_memo_applications;
    CREATE POLICY credit_memo_apps_admin_manage
    ON public.credit_memo_applications
    FOR ALL
    TO authenticated
    USING (public.current_user_is_admin())
    WITH CHECK (public.current_user_is_admin());
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE 'Phase 3e credit module authenticated-access hotfix applied successfully.';
END $$;

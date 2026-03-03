-- Phase 3c Hotfix: restore authenticated read access for category tree tables.
-- Why: phase 3 added anon-only read policies for category/subcategory configs,
--      but authenticated users (admin/pharmacy/group) also need read access.
-- Safe to run multiple times.

DO $$
BEGIN
  IF to_regclass('public.category_configs') IS NOT NULL THEN
    GRANT SELECT ON TABLE public.category_configs TO authenticated;

    DROP POLICY IF EXISTS category_configs_authenticated_read ON public.category_configs;
    CREATE POLICY category_configs_authenticated_read
    ON public.category_configs
    FOR SELECT
    TO authenticated
    USING (true);

    -- Ensure admin CRUD remains functional after phase 3 policy cleanup.
    DROP POLICY IF EXISTS category_configs_admin_manage_authenticated ON public.category_configs;
    CREATE POLICY category_configs_admin_manage_authenticated
    ON public.category_configs
    FOR ALL
    TO authenticated
    USING (public.current_user_is_admin())
    WITH CHECK (public.current_user_is_admin());
  END IF;

  IF to_regclass('public.subcategory_configs') IS NOT NULL THEN
    GRANT SELECT ON TABLE public.subcategory_configs TO authenticated;

    DROP POLICY IF EXISTS subcategory_configs_authenticated_read ON public.subcategory_configs;
    CREATE POLICY subcategory_configs_authenticated_read
    ON public.subcategory_configs
    FOR SELECT
    TO authenticated
    USING (true);

    -- Restore admin CRUD (the prior TO public admin policy was removed in phase 3).
    DROP POLICY IF EXISTS subcategory_configs_admin_manage_authenticated ON public.subcategory_configs;
    CREATE POLICY subcategory_configs_admin_manage_authenticated
    ON public.subcategory_configs
    FOR ALL
    TO authenticated
    USING (public.current_user_is_admin())
    WITH CHECK (public.current_user_is_admin());
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE 'Phase 3c category tree authenticated-read hotfix applied successfully.';
END $$;

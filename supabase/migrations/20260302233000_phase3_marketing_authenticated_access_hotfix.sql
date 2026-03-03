-- Phase 3d Hotfix: restore authenticated access for marketing tables.
-- Why: phase 3 removed legacy TO public policies. Logged-in users/admins
--      then lost access to blogs/banners/offers reads and admin CRUD.
-- Safe to run multiple times.

DO $$
BEGIN
  -- -------------------------------------------------------------------------
  -- blogs
  -- -------------------------------------------------------------------------
  IF to_regclass('public.blogs') IS NOT NULL THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.blogs TO authenticated;

    DROP POLICY IF EXISTS blogs_authenticated_read_published ON public.blogs;
    CREATE POLICY blogs_authenticated_read_published
    ON public.blogs
    FOR SELECT
    TO authenticated
    USING (
      COALESCE(is_published, false) = true
      OR public.current_user_is_admin()
    );

    DROP POLICY IF EXISTS blogs_admin_manage_authenticated ON public.blogs;
    CREATE POLICY blogs_admin_manage_authenticated
    ON public.blogs
    FOR ALL
    TO authenticated
    USING (public.current_user_is_admin())
    WITH CHECK (public.current_user_is_admin());
  END IF;

  -- -------------------------------------------------------------------------
  -- banners
  -- -------------------------------------------------------------------------
  IF to_regclass('public.banners') IS NOT NULL THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.banners TO authenticated;

    DROP POLICY IF EXISTS banners_authenticated_read_active ON public.banners;
    CREATE POLICY banners_authenticated_read_active
    ON public.banners
    FOR SELECT
    TO authenticated
    USING (
      (
        COALESCE(is_active, true) = true
        AND (start_date IS NULL OR start_date <= NOW())
        AND (end_date IS NULL OR end_date >= NOW())
      )
      OR public.current_user_is_admin()
    );

    DROP POLICY IF EXISTS banners_admin_manage_authenticated ON public.banners;
    CREATE POLICY banners_admin_manage_authenticated
    ON public.banners
    FOR ALL
    TO authenticated
    USING (public.current_user_is_admin())
    WITH CHECK (public.current_user_is_admin());
  END IF;

  -- -------------------------------------------------------------------------
  -- offers
  -- -------------------------------------------------------------------------
  IF to_regclass('public.offers') IS NOT NULL THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.offers TO authenticated;

    DROP POLICY IF EXISTS offers_authenticated_read_active ON public.offers;
    CREATE POLICY offers_authenticated_read_active
    ON public.offers
    FOR SELECT
    TO authenticated
    USING (
      (
        COALESCE(is_active, true) = true
        AND (start_date IS NULL OR start_date <= NOW())
        AND (end_date IS NULL OR end_date >= NOW())
      )
      OR public.current_user_is_admin()
    );

    DROP POLICY IF EXISTS offers_admin_manage_authenticated ON public.offers;
    CREATE POLICY offers_admin_manage_authenticated
    ON public.offers
    FOR ALL
    TO authenticated
    USING (public.current_user_is_admin())
    WITH CHECK (public.current_user_is_admin());
  END IF;

  -- -------------------------------------------------------------------------
  -- announcements
  -- -------------------------------------------------------------------------
  IF to_regclass('public.announcements') IS NOT NULL THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.announcements TO authenticated;

    DROP POLICY IF EXISTS announcements_authenticated_read_active ON public.announcements;
    CREATE POLICY announcements_authenticated_read_active
    ON public.announcements
    FOR SELECT
    TO authenticated
    USING (
      (
        COALESCE(is_active, true) = true
        AND (start_date IS NULL OR start_date <= NOW())
        AND (end_date IS NULL OR end_date >= NOW())
        AND (
          COALESCE(target_audience::text, 'all') = 'all'
          OR COALESCE(target_audience::text, '') = COALESCE((SELECT p.type::text FROM public.profiles p WHERE p.id = auth.uid()), '')
        )
      )
      OR public.current_user_is_admin()
    );

    DROP POLICY IF EXISTS announcements_admin_manage_authenticated ON public.announcements;
    CREATE POLICY announcements_admin_manage_authenticated
    ON public.announcements
    FOR ALL
    TO authenticated
    USING (public.current_user_is_admin())
    WITH CHECK (public.current_user_is_admin());
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE 'Phase 3d marketing authenticated-access hotfix applied successfully.';
END $$;

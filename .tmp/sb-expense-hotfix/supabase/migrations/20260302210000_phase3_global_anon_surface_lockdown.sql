-- Phase 3 Global Anon Surface Lockdown
-- Purpose:
-- 1) Remove accidental anon/public access across ALL public tables/functions.
-- 2) Re-allow only the minimum public storefront/login flows.
-- 3) Keep migration idempotent and safe for repeated execution.

-- ---------------------------------------------------------------------------
-- 0) Ensure helper exists (used by some policies in earlier phases)
-- ---------------------------------------------------------------------------
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
-- ---------------------------------------------------------------------------
-- 1) Global revoke on tables + enforce RLS
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon', r.tablename);
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC', r.tablename);
  END LOOP;
END $$;
-- ---------------------------------------------------------------------------
-- 2) Remove anon/public policies globally (clean baseline)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        roles::text ILIKE '%anon%'
        OR roles::text ILIKE '%public%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END $$;
-- ---------------------------------------------------------------------------
-- 3) Explicit public allowlist (anon)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  has_col BOOLEAN;
BEGIN
  -- products: public can read active catalog items only
  IF to_regclass('public.products') IS NOT NULL THEN
    GRANT SELECT ON TABLE public.products TO anon;
    DROP POLICY IF EXISTS products_anon_read_active ON public.products;

    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'is_active'
    ) INTO has_col;

    IF has_col THEN
      CREATE POLICY products_anon_read_active
      ON public.products
      FOR SELECT
      TO anon
      USING (COALESCE(is_active, true) = true);
    ELSE
      CREATE POLICY products_anon_read_active
      ON public.products
      FOR SELECT
      TO anon
      USING (true);
    END IF;
  END IF;

  -- product_sizes: public can read active sizes only
  IF to_regclass('public.product_sizes') IS NOT NULL THEN
    GRANT SELECT ON TABLE public.product_sizes TO anon;
    DROP POLICY IF EXISTS product_sizes_anon_read_active ON public.product_sizes;

    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'product_sizes' AND column_name = 'is_active'
    ) INTO has_col;

    IF has_col THEN
      CREATE POLICY product_sizes_anon_read_active
      ON public.product_sizes
      FOR SELECT
      TO anon
      USING (COALESCE(is_active, true) = true);
    ELSE
      CREATE POLICY product_sizes_anon_read_active
      ON public.product_sizes
      FOR SELECT
      TO anon
      USING (true);
    END IF;
  END IF;

  -- category_configs: public can read for catalog/category rendering
  IF to_regclass('public.category_configs') IS NOT NULL THEN
    GRANT SELECT ON TABLE public.category_configs TO anon;
    DROP POLICY IF EXISTS category_configs_anon_read ON public.category_configs;

    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'category_configs' AND column_name = 'is_active'
    ) INTO has_col;

    IF has_col THEN
      CREATE POLICY category_configs_anon_read
      ON public.category_configs
      FOR SELECT
      TO anon
      USING (COALESCE(is_active, true) = true);
    ELSE
      CREATE POLICY category_configs_anon_read
      ON public.category_configs
      FOR SELECT
      TO anon
      USING (true);
    END IF;
  END IF;

  -- subcategory_configs: public can read for catalog/category rendering
  IF to_regclass('public.subcategory_configs') IS NOT NULL THEN
    GRANT SELECT ON TABLE public.subcategory_configs TO anon;
    DROP POLICY IF EXISTS subcategory_configs_anon_read ON public.subcategory_configs;

    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'subcategory_configs' AND column_name = 'is_active'
    ) INTO has_col;

    IF has_col THEN
      CREATE POLICY subcategory_configs_anon_read
      ON public.subcategory_configs
      FOR SELECT
      TO anon
      USING (COALESCE(is_active, true) = true);
    ELSE
      CREATE POLICY subcategory_configs_anon_read
      ON public.subcategory_configs
      FOR SELECT
      TO anon
      USING (true);
    END IF;
  END IF;

  -- blogs: public can read published posts only
  IF to_regclass('public.blogs') IS NOT NULL THEN
    GRANT SELECT ON TABLE public.blogs TO anon;
    DROP POLICY IF EXISTS blogs_anon_read_published ON public.blogs;

    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'blogs' AND column_name = 'is_published'
    ) INTO has_col;

    IF has_col THEN
      CREATE POLICY blogs_anon_read_published
      ON public.blogs
      FOR SELECT
      TO anon
      USING (COALESCE(is_published, false) = true);
    ELSE
      CREATE POLICY blogs_anon_read_published
      ON public.blogs
      FOR SELECT
      TO anon
      USING (true);
    END IF;
  END IF;

  -- newsletter_subscribers: allow public signup (insert/upsert) only
  IF to_regclass('public.newsletter_subscribers') IS NOT NULL THEN
    GRANT INSERT, UPDATE ON TABLE public.newsletter_subscribers TO anon;

    DROP POLICY IF EXISTS newsletter_subscribers_anon_insert ON public.newsletter_subscribers;
    CREATE POLICY newsletter_subscribers_anon_insert
    ON public.newsletter_subscribers
    FOR INSERT
    TO anon
    WITH CHECK (
      email IS NOT NULL
      AND position('@' IN email) > 1
      AND position('.' IN email) > position('@' IN email)
      AND (
        NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'newsletter_subscribers'
            AND column_name = 'status'
        )
        OR COALESCE(status, 'active') = 'active'
      )
    );

    DROP POLICY IF EXISTS newsletter_subscribers_anon_upsert ON public.newsletter_subscribers;
    CREATE POLICY newsletter_subscribers_anon_upsert
    ON public.newsletter_subscribers
    FOR UPDATE
    TO anon
    USING (true)
    WITH CHECK (
      email IS NOT NULL
      AND position('@' IN email) > 1
      AND position('.' IN email) > position('@' IN email)
      AND (
        NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'newsletter_subscribers'
            AND column_name = 'status'
        )
        OR COALESCE(status, 'active') = 'active'
      )
    );
  END IF;
END $$;
-- ---------------------------------------------------------------------------
-- 4) Function execute lockdown (public schema)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  f RECORD;
BEGIN
  FOR f IN
    SELECT n.nspname AS schema_name,
           p.proname AS function_name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon',
      f.schema_name,
      f.function_name,
      f.args
    );
  END LOOP;
END $$;
-- Allow only required public login helper RPC
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'check_email_verification'
      AND pg_get_function_identity_arguments(p.oid) IN ('text', 'user_email text')
  ) THEN
    GRANT EXECUTE ON FUNCTION public.check_email_verification(TEXT) TO anon;
    GRANT EXECUTE ON FUNCTION public.check_email_verification(TEXT) TO authenticated;
  END IF;
END $$;
-- ---------------------------------------------------------------------------
-- 5) Verification gate
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_bad_table_grants INTEGER;
  v_bad_function_grants INTEGER;
  v_bad_policies INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_bad_table_grants
  FROM information_schema.table_privileges tp
  JOIN information_schema.tables t
    ON t.table_schema = tp.table_schema
   AND t.table_name = tp.table_name
  WHERE tp.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND lower(tp.grantee) IN ('anon', 'public')
    AND (
      tp.table_name NOT IN (
        'products',
        'product_sizes',
        'category_configs',
        'subcategory_configs',
        'blogs',
        'newsletter_subscribers'
      )
      OR (
        tp.table_name = 'newsletter_subscribers'
        AND tp.privilege_type NOT IN ('INSERT', 'UPDATE')
      )
      OR (
        tp.table_name IN ('products','product_sizes','category_configs','subcategory_configs','blogs')
        AND tp.privilege_type <> 'SELECT'
      )
    );

  SELECT COUNT(*)
  INTO v_bad_function_grants
  FROM information_schema.role_routine_grants
  WHERE specific_schema = 'public'
    AND lower(grantee) IN ('anon', 'public')
    AND routine_name <> 'check_email_verification';

  SELECT COUNT(*)
  INTO v_bad_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND (
      roles::text ILIKE '%anon%'
      OR roles::text ILIKE '%public%'
    )
    AND (
      tablename NOT IN (
        'products',
        'product_sizes',
        'category_configs',
        'subcategory_configs',
        'blogs',
        'newsletter_subscribers'
      )
    );

  IF v_bad_table_grants > 0 THEN
    RAISE EXCEPTION 'Phase 3 verification failed: anon/public table grants outside allowlist (% rows)', v_bad_table_grants;
  END IF;

  IF v_bad_function_grants > 0 THEN
    RAISE EXCEPTION 'Phase 3 verification failed: anon/public function execute grants outside allowlist (% rows)', v_bad_function_grants;
  END IF;

  IF v_bad_policies > 0 THEN
    RAISE EXCEPTION 'Phase 3 verification failed: anon/public policies exist outside allowlist (% rows)', v_bad_policies;
  END IF;
END $$;
DO $$
BEGIN
  RAISE NOTICE 'Phase 3 global anon lockdown applied successfully.';
END $$;

-- Phase 1 Emergency Security Lockdown
-- Goal: Immediate containment of anonymous access to sensitive tables and risky RPC grants.
-- Safe to run multiple times.

-- ---------------------------------------------------------------------------
-- 1) Revoke anonymous table privileges for exposed tables
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  tbl TEXT;
  exposed_tables TEXT[] := ARRAY[
    'profiles',
    'email_queue',
    'email_templates',
    'email_automations',
    'daily_deals',
    'daily_deals_settings',
    'product_sizes',
    'inventory_transactions',
    'product_batches',
    'batch_transactions',
    'batch_movements',
    'notifications',
    'payment_transactions',
    'announcements'
  ];
BEGIN
  FOREACH tbl IN ARRAY exposed_tables
  LOOP
    IF to_regclass('public.' || tbl) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', tbl);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 2) Drop known permissive debug/open policies where present
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.announcements') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Authenticated users can manage announcements" ON public.announcements;
    DROP POLICY IF EXISTS "Allow anon insert for testing" ON public.announcements;
  END IF;

  IF to_regclass('public.email_queue') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Everyone can insert email_queue" ON public.email_queue;
    DROP POLICY IF EXISTS "Everyone can select email_queue" ON public.email_queue;
  END IF;

  IF to_regclass('public.profiles') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Everyone can view profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
  END IF;

  IF to_regclass('public.payment_transactions') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Authenticated users can insert transactions" ON public.payment_transactions;
  END IF;

  IF to_regclass('public.product_sizes') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Allow authenticated users to update product_sizes" ON public.product_sizes;
  END IF;

  IF to_regclass('public.notifications') IS NOT NULL THEN
    DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
  END IF;

  IF to_regclass('public.email_automations') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Everyone can update email_automations" ON public.email_automations;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3) Recreate safe minimum policies for removed broad policies
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'profiles'
        AND policyname = 'Profiles select self or admin'
    ) THEN
      CREATE POLICY "Profiles select self or admin"
      ON public.profiles
      FOR SELECT
      TO authenticated
      USING (
        auth.uid() = id
        OR EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role IN ('admin', 'superadmin')
        )
      );
    END IF;
  END IF;

  IF to_regclass('public.email_queue') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'email_queue'
        AND policyname = 'Admins manage email_queue'
    ) THEN
      CREATE POLICY "Admins manage email_queue"
      ON public.email_queue
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role IN ('admin', 'superadmin')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role IN ('admin', 'superadmin')
        )
      );
    END IF;
  END IF;

  IF to_regclass('public.payment_transactions') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'payment_transactions'
        AND policyname = 'Users insert own payment transactions'
    ) THEN
      CREATE POLICY "Users insert own payment transactions"
      ON public.payment_transactions
      FOR INSERT
      TO authenticated
      WITH CHECK (
        auth.uid() = profile_id
        OR EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role IN ('admin', 'superadmin')
        )
      );
    END IF;
  END IF;

  IF to_regclass('public.product_sizes') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'product_sizes'
        AND policyname = 'Admins update product_sizes'
    ) THEN
      CREATE POLICY "Admins update product_sizes"
      ON public.product_sizes
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role IN ('admin', 'superadmin')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role IN ('admin', 'superadmin')
        )
      );
    END IF;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4) Lock referral RPC to authenticated only (remove anon execute)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'apply_referral_code'
      AND pg_get_function_identity_arguments(p.oid) = 'uuid, text'
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.apply_referral_code(UUID, TEXT) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.apply_referral_code(UUID, TEXT) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.apply_referral_code(UUID, TEXT) TO authenticated;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5) Verification helper output (non-blocking)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  RAISE NOTICE 'Phase 1 lockdown migration applied. Run policy audit queries before production sign-off.';
END $$;

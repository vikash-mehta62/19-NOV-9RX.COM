-- Phase 2 RLS Least-Privilege Hardening
-- Purpose:
-- 1) Replace overlapping/legacy permissive policies with explicit least-privilege policies.
-- 2) Keep anonymous access blocked for sensitive tables.
-- 3) Ensure referral RPC is authenticated-only and bound to the caller identity.
-- 4) Fail migration if dangerous policy/grant patterns still exist.

-- ---------------------------------------------------------------------------
-- Helpers (security-definer, read-only)
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

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT p.role INTO v_role
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;

  RETURN COALESCE(v_role, '');
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_group_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_group_id UUID;
BEGIN
  SELECT p.group_id INTO v_group_id
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;

  RETURN v_group_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Drop all existing policies on targeted tables (clean baseline)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
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
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Revoke/Grant table privileges
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  tbl TEXT;
  target_tables TEXT[] := ARRAY[
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
  FOREACH tbl IN ARRAY target_tables LOOP
    IF to_regclass('public.' || tbl) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', tbl);
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated', tbl);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    CREATE POLICY "profiles_select_least_privilege"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
      auth.uid() = id
      OR public.current_user_is_admin()
      OR group_id = auth.uid()
      OR id = public.current_user_group_id()
    );

    CREATE POLICY "profiles_insert_least_privilege"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (
      auth.role() = 'service_role'
      OR auth.uid() = id
      OR public.current_user_is_admin()
    );

    CREATE POLICY "profiles_update_least_privilege"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (
      auth.uid() = id
      OR public.current_user_is_admin()
      OR (public.current_user_role() = 'group' AND group_id = auth.uid())
    )
    WITH CHECK (
      auth.uid() = id
      OR public.current_user_is_admin()
      OR (public.current_user_role() = 'group' AND group_id = auth.uid())
    );

    CREATE POLICY "profiles_delete_admin_only"
    ON public.profiles
    FOR DELETE
    TO authenticated
    USING (public.current_user_is_admin());
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- email tables (admin only)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.email_templates') IS NOT NULL THEN
    CREATE POLICY "email_templates_admin_only"
    ON public.email_templates
    FOR ALL
    TO authenticated
    USING (public.current_user_is_admin())
    WITH CHECK (public.current_user_is_admin());
  END IF;

  IF to_regclass('public.email_automations') IS NOT NULL THEN
    CREATE POLICY "email_automations_admin_only"
    ON public.email_automations
    FOR ALL
    TO authenticated
    USING (public.current_user_is_admin())
    WITH CHECK (public.current_user_is_admin());
  END IF;

  IF to_regclass('public.email_queue') IS NOT NULL THEN
    CREATE POLICY "email_queue_admin_only"
    ON public.email_queue
    FOR ALL
    TO authenticated
    USING (public.current_user_is_admin())
    WITH CHECK (public.current_user_is_admin());
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- marketing tables (authenticated read active; admin manage)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.daily_deals') IS NOT NULL THEN
    CREATE POLICY "daily_deals_read_active_authenticated"
    ON public.daily_deals
    FOR SELECT
    TO authenticated
    USING (
      is_active = true
      AND (start_date IS NULL OR start_date <= now())
      AND (end_date IS NULL OR end_date >= now())
    );

    CREATE POLICY "daily_deals_admin_manage"
    ON public.daily_deals
    FOR ALL
    TO authenticated
    USING (public.current_user_is_admin())
    WITH CHECK (public.current_user_is_admin());
  END IF;

  IF to_regclass('public.daily_deals_settings') IS NOT NULL THEN
    CREATE POLICY "daily_deals_settings_read_authenticated"
    ON public.daily_deals_settings
    FOR SELECT
    TO authenticated
    USING (is_enabled = true OR public.current_user_is_admin());

    CREATE POLICY "daily_deals_settings_admin_manage"
    ON public.daily_deals_settings
    FOR ALL
    TO authenticated
    USING (public.current_user_is_admin())
    WITH CHECK (public.current_user_is_admin());
  END IF;

  IF to_regclass('public.announcements') IS NOT NULL THEN
    CREATE POLICY "announcements_read_active_authenticated"
    ON public.announcements
    FOR SELECT
    TO authenticated
    USING (
      is_active = true
      AND (start_date IS NULL OR start_date <= now())
      AND (end_date IS NULL OR end_date >= now())
      AND (
        COALESCE(target_audience::text, 'all') = 'all'
        OR COALESCE(target_audience::text, '') = COALESCE((SELECT p.type::text FROM public.profiles p WHERE p.id = auth.uid()), '')
      )
    );

    CREATE POLICY "announcements_admin_manage"
    ON public.announcements
    FOR ALL
    TO authenticated
    USING (public.current_user_is_admin())
    WITH CHECK (public.current_user_is_admin());
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- product_sizes
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.product_sizes') IS NOT NULL THEN
    CREATE POLICY "product_sizes_read_authenticated"
    ON public.product_sizes
    FOR SELECT
    TO authenticated
    USING (is_active = true OR public.current_user_is_admin());

    CREATE POLICY "product_sizes_admin_manage"
    ON public.product_sizes
    FOR ALL
    TO authenticated
    USING (public.current_user_is_admin())
    WITH CHECK (public.current_user_is_admin());
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- inventory tables (admin only)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.inventory_transactions') IS NOT NULL THEN
    CREATE POLICY "inventory_transactions_admin_only"
    ON public.inventory_transactions
    FOR ALL
    TO authenticated
    USING (public.current_user_is_admin())
    WITH CHECK (public.current_user_is_admin());
  END IF;

  IF to_regclass('public.product_batches') IS NOT NULL THEN
    CREATE POLICY "product_batches_admin_only"
    ON public.product_batches
    FOR ALL
    TO authenticated
    USING (public.current_user_is_admin())
    WITH CHECK (public.current_user_is_admin());
  END IF;

  IF to_regclass('public.batch_transactions') IS NOT NULL THEN
    CREATE POLICY "batch_transactions_admin_only"
    ON public.batch_transactions
    FOR ALL
    TO authenticated
    USING (public.current_user_is_admin())
    WITH CHECK (public.current_user_is_admin());
  END IF;

  IF to_regclass('public.batch_movements') IS NOT NULL THEN
    CREATE POLICY "batch_movements_admin_only"
    ON public.batch_movements
    FOR ALL
    TO authenticated
    USING (public.current_user_is_admin())
    WITH CHECK (public.current_user_is_admin());
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.notifications') IS NOT NULL THEN
    CREATE POLICY "notifications_select_own_or_admin"
    ON public.notifications
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR public.current_user_is_admin());

    CREATE POLICY "notifications_update_own_or_admin"
    ON public.notifications
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id OR public.current_user_is_admin())
    WITH CHECK (auth.uid() = user_id OR public.current_user_is_admin());

    CREATE POLICY "notifications_insert_admin_only"
    ON public.notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (public.current_user_is_admin());

    CREATE POLICY "notifications_delete_own_or_admin"
    ON public.notifications
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id OR public.current_user_is_admin());
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- payment_transactions
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.payment_transactions') IS NOT NULL THEN
    CREATE POLICY "payment_transactions_select_own_or_admin"
    ON public.payment_transactions
    FOR SELECT
    TO authenticated
    USING (auth.uid() = profile_id OR public.current_user_is_admin());

    CREATE POLICY "payment_transactions_insert_own_or_admin"
    ON public.payment_transactions
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = profile_id OR public.current_user_is_admin());

    CREATE POLICY "payment_transactions_update_admin_only"
    ON public.payment_transactions
    FOR UPDATE
    TO authenticated
    USING (public.current_user_is_admin())
    WITH CHECK (public.current_user_is_admin());

    CREATE POLICY "payment_transactions_delete_admin_only"
    ON public.payment_transactions
    FOR DELETE
    TO authenticated
    USING (public.current_user_is_admin());
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Referral RPC hardening: authenticated caller must match p_new_user_id
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_referral_code(
  p_new_user_id UUID,
  p_referral_code TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
  v_referrer_name TEXT;
  v_existing_referral UUID;
  v_referral_bonus INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_new_user_id THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized referral request');
  END IF;

  SELECT COALESCE(referral_bonus, 200) INTO v_referral_bonus
  FROM rewards_config
  LIMIT 1;

  IF v_referral_bonus IS NULL THEN
    v_referral_bonus := 200;
  END IF;

  SELECT id, COALESCE(first_name, company_name, 'A friend')
  INTO v_referrer_id, v_referrer_name
  FROM profiles
  WHERE referral_code = UPPER(p_referral_code);

  IF v_referrer_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Invalid referral code');
  END IF;

  IF v_referrer_id = p_new_user_id THEN
    RETURN json_build_object('success', false, 'message', 'You cannot use your own referral code');
  END IF;

  SELECT id INTO v_existing_referral
  FROM referrals
  WHERE referred_id = p_new_user_id
  LIMIT 1;

  IF v_existing_referral IS NOT NULL THEN
    RETURN json_build_object('success', false, 'message', 'You have already used a referral code');
  END IF;

  UPDATE profiles
  SET referred_by = v_referrer_id
  WHERE id = p_new_user_id;

  INSERT INTO referrals (referrer_id, referred_id, status, points_awarded)
  VALUES (v_referrer_id, p_new_user_id, 'pending', 0);

  RETURN json_build_object(
    'success', true,
    'message', 'Referral applied! You and ' || v_referrer_name || ' will receive ' || v_referral_bonus || ' bonus points after your first paid order.',
    'referrer_name', v_referrer_name,
    'points_awarded', v_referral_bonus,
    'status', 'pending'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_referral_code(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_referral_code(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.apply_referral_code(UUID, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- Verification gate (fail migration if dangerous patterns remain)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_public_policy_count INTEGER;
  v_true_policy_count INTEGER;
  v_anon_grant_count INTEGER;
  v_referral_anon_grant BOOLEAN;
  v_referral_public_grant BOOLEAN;
BEGIN
  SELECT COUNT(*)
  INTO v_public_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN (
      'profiles','email_queue','email_templates','email_automations',
      'daily_deals','daily_deals_settings','product_sizes',
      'inventory_transactions','product_batches','batch_transactions','batch_movements',
      'notifications','payment_transactions','announcements'
    )
    AND roles::text LIKE '%public%';

  SELECT COUNT(*)
  INTO v_true_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN (
      'profiles','email_queue','email_templates','email_automations',
      'daily_deals','daily_deals_settings','product_sizes',
      'inventory_transactions','product_batches','batch_transactions','batch_movements',
      'notifications','payment_transactions','announcements'
    )
    AND (
      lower(COALESCE(qual, '')) = 'true'
      OR lower(COALESCE(with_check, '')) = 'true'
    );

  SELECT COUNT(*)
  INTO v_anon_grant_count
  FROM information_schema.table_privileges
  WHERE table_schema = 'public'
    AND table_name IN (
      'profiles','email_queue','email_templates','email_automations',
      'daily_deals','daily_deals_settings','product_sizes',
      'inventory_transactions','product_batches','batch_transactions','batch_movements',
      'notifications','payment_transactions','announcements'
    )
    AND grantee = 'anon';

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.role_routine_grants
    WHERE specific_schema = 'public'
      AND routine_name = 'apply_referral_code'
      AND grantee = 'anon'
  ) INTO v_referral_anon_grant;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.role_routine_grants
    WHERE specific_schema = 'public'
      AND routine_name = 'apply_referral_code'
      AND grantee = 'public'
  ) INTO v_referral_public_grant;

  IF v_public_policy_count > 0 THEN
    RAISE EXCEPTION 'Phase 2 verification failed: % public-role policies still present on hardened tables', v_public_policy_count;
  END IF;

  IF v_true_policy_count > 0 THEN
    RAISE EXCEPTION 'Phase 2 verification failed: % unconditional true policies still present on hardened tables', v_true_policy_count;
  END IF;

  IF v_anon_grant_count > 0 THEN
    RAISE EXCEPTION 'Phase 2 verification failed: anon table grants still present on hardened tables (% rows)', v_anon_grant_count;
  END IF;

  IF v_referral_anon_grant OR v_referral_public_grant THEN
    RAISE EXCEPTION 'Phase 2 verification failed: apply_referral_code still granted to anon/public';
  END IF;
END $$;

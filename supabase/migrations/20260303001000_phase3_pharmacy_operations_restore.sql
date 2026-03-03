-- Phase 3g: Pharmacy Operations Restore (least-privilege authenticated policies)
-- Purpose:
-- 1) Restore broken pharmacy-side operations after Phase 3 global policy cleanup.
-- 2) Keep anon exposure closed; allow only authenticated self/admin paths.
-- 3) Cover order creation, wishlist, rewards, cart sync, and statement download.
-- Safe to run multiple times.

DO $$
BEGIN
  -- -------------------------------------------------------------------------
  -- products (authenticated catalog read)
  -- -------------------------------------------------------------------------
  IF to_regclass('public.products') IS NOT NULL THEN
    GRANT SELECT ON TABLE public.products TO authenticated;

    DROP POLICY IF EXISTS products_authenticated_read_active ON public.products;
    CREATE POLICY products_authenticated_read_active
    ON public.products
    FOR SELECT
    TO authenticated
    USING (COALESCE(is_active, true) = true OR public.current_user_is_admin());
  END IF;

  -- -------------------------------------------------------------------------
  -- wishlist (pharmacy self-service)
  -- -------------------------------------------------------------------------
  IF to_regclass('public.wishlist') IS NOT NULL THEN
    ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.wishlist TO authenticated;

    DROP POLICY IF EXISTS wishlist_self_or_admin_select ON public.wishlist;
    CREATE POLICY wishlist_self_or_admin_select
    ON public.wishlist
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.current_user_is_admin());

    DROP POLICY IF EXISTS wishlist_self_or_admin_insert ON public.wishlist;
    CREATE POLICY wishlist_self_or_admin_insert
    ON public.wishlist
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid() OR public.current_user_is_admin());

    DROP POLICY IF EXISTS wishlist_self_or_admin_update ON public.wishlist;
    CREATE POLICY wishlist_self_or_admin_update
    ON public.wishlist
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid() OR public.current_user_is_admin())
    WITH CHECK (user_id = auth.uid() OR public.current_user_is_admin());

    DROP POLICY IF EXISTS wishlist_self_or_admin_delete ON public.wishlist;
    CREATE POLICY wishlist_self_or_admin_delete
    ON public.wishlist
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid() OR public.current_user_is_admin());
  END IF;

  -- -------------------------------------------------------------------------
  -- carts (cart sync)
  -- -------------------------------------------------------------------------
  IF to_regclass('public.carts') IS NOT NULL THEN
    ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.carts TO authenticated;

    DROP POLICY IF EXISTS carts_self_or_admin_select ON public.carts;
    CREATE POLICY carts_self_or_admin_select
    ON public.carts
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.current_user_is_admin());

    DROP POLICY IF EXISTS carts_self_or_admin_insert ON public.carts;
    CREATE POLICY carts_self_or_admin_insert
    ON public.carts
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid() OR public.current_user_is_admin());

    DROP POLICY IF EXISTS carts_self_or_admin_update ON public.carts;
    CREATE POLICY carts_self_or_admin_update
    ON public.carts
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid() OR public.current_user_is_admin())
    WITH CHECK (user_id = auth.uid() OR public.current_user_is_admin());

    DROP POLICY IF EXISTS carts_self_or_admin_delete ON public.carts;
    CREATE POLICY carts_self_or_admin_delete
    ON public.carts
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid() OR public.current_user_is_admin());
  END IF;

  -- -------------------------------------------------------------------------
  -- locations (customer address selection in wizard)
  -- -------------------------------------------------------------------------
  IF to_regclass('public.locations') IS NOT NULL THEN
    ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.locations TO authenticated;

    DROP POLICY IF EXISTS locations_self_or_admin_select ON public.locations;
    CREATE POLICY locations_self_or_admin_select
    ON public.locations
    FOR SELECT
    TO authenticated
    USING (profile_id = auth.uid() OR public.current_user_is_admin());

    DROP POLICY IF EXISTS locations_self_or_admin_insert ON public.locations;
    CREATE POLICY locations_self_or_admin_insert
    ON public.locations
    FOR INSERT
    TO authenticated
    WITH CHECK (profile_id = auth.uid() OR public.current_user_is_admin());

    DROP POLICY IF EXISTS locations_self_or_admin_update ON public.locations;
    CREATE POLICY locations_self_or_admin_update
    ON public.locations
    FOR UPDATE
    TO authenticated
    USING (profile_id = auth.uid() OR public.current_user_is_admin())
    WITH CHECK (profile_id = auth.uid() OR public.current_user_is_admin());

    DROP POLICY IF EXISTS locations_self_or_admin_delete ON public.locations;
    CREATE POLICY locations_self_or_admin_delete
    ON public.locations
    FOR DELETE
    TO authenticated
    USING (profile_id = auth.uid() OR public.current_user_is_admin());
  END IF;

  -- -------------------------------------------------------------------------
  -- orders (pharmacy create/view own)
  -- -------------------------------------------------------------------------
  IF to_regclass('public.orders') IS NOT NULL THEN
    ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
    GRANT SELECT, INSERT, UPDATE ON TABLE public.orders TO authenticated;

    DROP POLICY IF EXISTS orders_self_or_admin_select ON public.orders;
    CREATE POLICY orders_self_or_admin_select
    ON public.orders
    FOR SELECT
    TO authenticated
    USING (profile_id = auth.uid() OR public.current_user_is_admin());

    DROP POLICY IF EXISTS orders_self_or_admin_insert ON public.orders;
    CREATE POLICY orders_self_or_admin_insert
    ON public.orders
    FOR INSERT
    TO authenticated
    WITH CHECK (profile_id = auth.uid() OR public.current_user_is_admin());

    DROP POLICY IF EXISTS orders_self_or_admin_update ON public.orders;
    CREATE POLICY orders_self_or_admin_update
    ON public.orders
    FOR UPDATE
    TO authenticated
    USING (profile_id = auth.uid() OR public.current_user_is_admin())
    WITH CHECK (profile_id = auth.uid() OR public.current_user_is_admin());
  END IF;

  -- -------------------------------------------------------------------------
  -- order_items (linked to user's orders)
  -- -------------------------------------------------------------------------
  IF to_regclass('public.order_items') IS NOT NULL THEN
    ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.order_items TO authenticated;

    DROP POLICY IF EXISTS order_items_self_or_admin_select ON public.order_items;
    CREATE POLICY order_items_self_or_admin_select
    ON public.order_items
    FOR SELECT
    TO authenticated
    USING (
      public.current_user_is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.orders o
        WHERE o.id = order_items.order_id
          AND o.profile_id = auth.uid()
      )
    );

    DROP POLICY IF EXISTS order_items_self_or_admin_insert ON public.order_items;
    CREATE POLICY order_items_self_or_admin_insert
    ON public.order_items
    FOR INSERT
    TO authenticated
    WITH CHECK (
      public.current_user_is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.orders o
        WHERE o.id = order_items.order_id
          AND o.profile_id = auth.uid()
      )
    );

    DROP POLICY IF EXISTS order_items_self_or_admin_update ON public.order_items;
    CREATE POLICY order_items_self_or_admin_update
    ON public.order_items
    FOR UPDATE
    TO authenticated
    USING (
      public.current_user_is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.orders o
        WHERE o.id = order_items.order_id
          AND o.profile_id = auth.uid()
      )
    )
    WITH CHECK (
      public.current_user_is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.orders o
        WHERE o.id = order_items.order_id
          AND o.profile_id = auth.uid()
      )
    );

    DROP POLICY IF EXISTS order_items_self_or_admin_delete ON public.order_items;
    CREATE POLICY order_items_self_or_admin_delete
    ON public.order_items
    FOR DELETE
    TO authenticated
    USING (
      public.current_user_is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.orders o
        WHERE o.id = order_items.order_id
          AND o.profile_id = auth.uid()
      )
    );
  END IF;

  -- -------------------------------------------------------------------------
  -- invoices (pharmacy statement + zero-total order invoice insert)
  -- -------------------------------------------------------------------------
  IF to_regclass('public.invoices') IS NOT NULL THEN
    ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
    GRANT SELECT, INSERT, UPDATE ON TABLE public.invoices TO authenticated;

    DROP POLICY IF EXISTS invoices_self_or_admin_select ON public.invoices;
    CREATE POLICY invoices_self_or_admin_select
    ON public.invoices
    FOR SELECT
    TO authenticated
    USING (profile_id = auth.uid() OR public.current_user_is_admin());

    DROP POLICY IF EXISTS invoices_self_or_admin_insert ON public.invoices;
    CREATE POLICY invoices_self_or_admin_insert
    ON public.invoices
    FOR INSERT
    TO authenticated
    WITH CHECK (profile_id = auth.uid() OR public.current_user_is_admin());

    DROP POLICY IF EXISTS invoices_self_or_admin_update ON public.invoices;
    CREATE POLICY invoices_self_or_admin_update
    ON public.invoices
    FOR UPDATE
    TO authenticated
    USING (profile_id = auth.uid() OR public.current_user_is_admin())
    WITH CHECK (profile_id = auth.uid() OR public.current_user_is_admin());
  END IF;

  -- -------------------------------------------------------------------------
  -- offers (pharmacy checkout visibility)
  -- -------------------------------------------------------------------------
  IF to_regclass('public.offers') IS NOT NULL THEN
    GRANT SELECT ON TABLE public.offers TO authenticated;

    DROP POLICY IF EXISTS offers_authenticated_read_active_checkout ON public.offers;
    CREATE POLICY offers_authenticated_read_active_checkout
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
  END IF;

  -- -------------------------------------------------------------------------
  -- rewards (pharmacy read/redeem flows)
  -- -------------------------------------------------------------------------
  IF to_regclass('public.rewards_config') IS NOT NULL THEN
    ALTER TABLE public.rewards_config ENABLE ROW LEVEL SECURITY;
    GRANT SELECT ON TABLE public.rewards_config TO authenticated;

    DROP POLICY IF EXISTS rewards_config_authenticated_read ON public.rewards_config;
    CREATE POLICY rewards_config_authenticated_read
    ON public.rewards_config
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;

  IF to_regclass('public.reward_tiers') IS NOT NULL THEN
    ALTER TABLE public.reward_tiers ENABLE ROW LEVEL SECURITY;
    GRANT SELECT ON TABLE public.reward_tiers TO authenticated;

    DROP POLICY IF EXISTS reward_tiers_authenticated_read ON public.reward_tiers;
    CREATE POLICY reward_tiers_authenticated_read
    ON public.reward_tiers
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;

  IF to_regclass('public.reward_items') IS NOT NULL THEN
    ALTER TABLE public.reward_items ENABLE ROW LEVEL SECURITY;
    GRANT SELECT ON TABLE public.reward_items TO authenticated;

    DROP POLICY IF EXISTS reward_items_authenticated_read_active ON public.reward_items;
    CREATE POLICY reward_items_authenticated_read_active
    ON public.reward_items
    FOR SELECT
    TO authenticated
    USING (COALESCE(is_active, true) = true OR public.current_user_is_admin());
  END IF;

  IF to_regclass('public.reward_transactions') IS NOT NULL THEN
    ALTER TABLE public.reward_transactions ENABLE ROW LEVEL SECURITY;
    GRANT SELECT, INSERT ON TABLE public.reward_transactions TO authenticated;

    DROP POLICY IF EXISTS reward_transactions_self_or_admin_select ON public.reward_transactions;
    CREATE POLICY reward_transactions_self_or_admin_select
    ON public.reward_transactions
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.current_user_is_admin());

    DROP POLICY IF EXISTS reward_transactions_self_or_admin_insert ON public.reward_transactions;
    CREATE POLICY reward_transactions_self_or_admin_insert
    ON public.reward_transactions
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid() OR public.current_user_is_admin());
  END IF;

  IF to_regclass('public.reward_redemptions') IS NOT NULL THEN
    ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;
    GRANT SELECT, INSERT, UPDATE ON TABLE public.reward_redemptions TO authenticated;

    DROP POLICY IF EXISTS reward_redemptions_self_or_admin_select ON public.reward_redemptions;
    CREATE POLICY reward_redemptions_self_or_admin_select
    ON public.reward_redemptions
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.current_user_is_admin());

    DROP POLICY IF EXISTS reward_redemptions_self_or_admin_insert ON public.reward_redemptions;
    CREATE POLICY reward_redemptions_self_or_admin_insert
    ON public.reward_redemptions
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid() OR public.current_user_is_admin());

    DROP POLICY IF EXISTS reward_redemptions_self_or_admin_update ON public.reward_redemptions;
    CREATE POLICY reward_redemptions_self_or_admin_update
    ON public.reward_redemptions
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid() OR public.current_user_is_admin())
    WITH CHECK (user_id = auth.uid() OR public.current_user_is_admin());
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Restore EXECUTE on essential pharmacy-facing RPCs
-- (Phase 3 revoked PUBLIC execute globally)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'generate_order_number'
  ) THEN
    GRANT EXECUTE ON FUNCTION public.generate_order_number() TO authenticated;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'generate_purchase_order_number'
  ) THEN
    GRANT EXECUTE ON FUNCTION public.generate_purchase_order_number() TO authenticated;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'generate_invoice_number'
  ) THEN
    GRANT EXECUTE ON FUNCTION public.generate_invoice_number() TO authenticated;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_order_status_counts'
  ) THEN
    GRANT EXECUTE ON FUNCTION public.get_order_status_counts() TO authenticated;
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE 'Phase 3g pharmacy operations restore applied successfully.';
END $$;

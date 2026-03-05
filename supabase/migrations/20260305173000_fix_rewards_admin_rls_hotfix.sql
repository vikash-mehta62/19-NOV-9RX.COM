-- Fix admin RLS for rewards management UI
-- Issue: reward_items only had SELECT policy after Phase 3 restore, so admin toggle/update failed.

DO $$
BEGIN
  IF to_regclass('public.rewards_config') IS NOT NULL THEN
    ALTER TABLE public.rewards_config ENABLE ROW LEVEL SECURITY;
    GRANT SELECT, INSERT, UPDATE ON TABLE public.rewards_config TO authenticated;

    DROP POLICY IF EXISTS rewards_config_admin_insert ON public.rewards_config;
    CREATE POLICY rewards_config_admin_insert
      ON public.rewards_config
      FOR INSERT
      TO authenticated
      WITH CHECK (public.current_user_is_admin());

    DROP POLICY IF EXISTS rewards_config_admin_update ON public.rewards_config;
    CREATE POLICY rewards_config_admin_update
      ON public.rewards_config
      FOR UPDATE
      TO authenticated
      USING (public.current_user_is_admin())
      WITH CHECK (public.current_user_is_admin());
  END IF;

  IF to_regclass('public.reward_items') IS NOT NULL THEN
    ALTER TABLE public.reward_items ENABLE ROW LEVEL SECURITY;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.reward_items TO authenticated;

    DROP POLICY IF EXISTS reward_items_admin_insert ON public.reward_items;
    CREATE POLICY reward_items_admin_insert
      ON public.reward_items
      FOR INSERT
      TO authenticated
      WITH CHECK (public.current_user_is_admin());

    DROP POLICY IF EXISTS reward_items_admin_update ON public.reward_items;
    CREATE POLICY reward_items_admin_update
      ON public.reward_items
      FOR UPDATE
      TO authenticated
      USING (public.current_user_is_admin())
      WITH CHECK (public.current_user_is_admin());

    DROP POLICY IF EXISTS reward_items_admin_delete ON public.reward_items;
    CREATE POLICY reward_items_admin_delete
      ON public.reward_items
      FOR DELETE
      TO authenticated
      USING (public.current_user_is_admin());
  END IF;
END $$;

-- Ensure PostgREST picks up policy changes
NOTIFY pgrst, 'reload schema';

-- Phase 3h Hotfix: restore authenticated access for order_activities.
-- Why: Phase 3 lockdown removed/invalidated practical insert path for
--      frontend activity logging, causing 403 RLS failures on POST /order_activities.
-- Safe to run multiple times.

DO $$
DECLARE
  p RECORD;
BEGIN
  IF to_regclass('public.order_activities') IS NULL THEN
    RAISE NOTICE 'order_activities table not found; skipping phase 3h hotfix.';
    RETURN;
  END IF;

  -- Ensure admin helper exists in case this DB missed earlier hardening phases.
  EXECUTE $fn$
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
  $fn$;

  ALTER TABLE public.order_activities ENABLE ROW LEVEL SECURITY;

  -- Keep anon/public locked down; authenticated gets explicit least-privilege grants.
  REVOKE ALL ON TABLE public.order_activities FROM anon;
  REVOKE ALL ON TABLE public.order_activities FROM PUBLIC;
  GRANT SELECT, INSERT ON TABLE public.order_activities TO authenticated;

  -- Clean baseline: remove any existing policies on this table to avoid conflicts.
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'order_activities'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.order_activities', p.policyname);
  END LOOP;

  -- Read policy:
  -- - admin can read all
  -- - users can read activities they performed
  -- - users can read activities tied to their own orders
  -- - service role allowed
  CREATE POLICY order_activities_self_or_admin_select
  ON public.order_activities
  FOR SELECT
  TO authenticated
  USING (
    auth.role() = 'service_role'
    OR public.current_user_is_admin()
    OR performed_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id = order_activities.order_id
        AND o.profile_id = auth.uid()
    )
  );

  -- Insert policy:
  -- - allow any authenticated caller to append activity rows
  -- - anon/public remains blocked by grants and TO authenticated
  -- This avoids checkout/order creation regressions caused by strict ownership
  -- checks while keeping reads restricted by the SELECT policy above.
  CREATE POLICY order_activities_self_or_admin_insert
  ON public.order_activities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
  );
END $$;

DO $$
BEGIN
  RAISE NOTICE 'Phase 3h order_activities authenticated-access hotfix applied successfully.';
END $$;

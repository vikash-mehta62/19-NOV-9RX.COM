-- Phase 3h-2 Hotfix: eliminate residual order_activities INSERT RLS failures.
-- Purpose:
-- 1) Keep anon/public blocked.
-- 2) Ensure authenticated users can insert order activity rows during order flows.
-- 3) Preserve restricted read behavior.
-- Safe to run multiple times.

DO $$
DECLARE
  p RECORD;
BEGIN
  IF to_regclass('public.order_activities') IS NULL THEN
    RAISE NOTICE 'order_activities table not found; skipping phase 3h-2 hotfix.';
    RETURN;
  END IF;

  ALTER TABLE public.order_activities ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON TABLE public.order_activities FROM anon;
  REVOKE ALL ON TABLE public.order_activities FROM PUBLIC;
  GRANT SELECT, INSERT ON TABLE public.order_activities TO authenticated;

  -- Remove all old policies to avoid hidden conflicts.
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'order_activities'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.order_activities', p.policyname);
  END LOOP;

  -- Restricted read: admin, actor, or owner of the linked order.
  CREATE POLICY order_activities_select_restricted
  ON public.order_activities
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND (
      performed_by = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.orders o
        WHERE o.id = order_activities.order_id
          AND o.profile_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND (
            p.role IN ('admin', 'superadmin')
            OR lower(COALESCE(p.role, '')) LIKE '%admin%'
            OR lower(COALESCE(p.type::text, '')) LIKE '%admin%'
          )
      )
    )
  );

  -- Insert stabilization: authenticated callers can append activity rows.
  CREATE POLICY order_activities_insert_authenticated
  ON public.order_activities
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
END $$;

DO $$
BEGIN
  RAISE NOTICE 'Phase 3h-2 order_activities RLS insert-relax hotfix applied successfully.';
END $$;


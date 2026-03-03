-- Hotfix: allow authenticated users to read group_pricing rows for their own scope.
-- This keeps admin access and adds non-admin SELECT for:
-- 1) direct membership (auth.uid() in group_ids)
-- 2) pharmacy-to-group membership (current_user_group_id() in group_ids)

DO $$
BEGIN
  IF to_regclass('public.group_pricing') IS NOT NULL THEN
    ALTER TABLE public.group_pricing ENABLE ROW LEVEL SECURITY;
    GRANT SELECT ON TABLE public.group_pricing TO authenticated;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'group_pricing'
        AND policyname = 'group_pricing_self_group_select'
    ) THEN
      CREATE POLICY group_pricing_self_group_select
      ON public.group_pricing
      FOR SELECT
      TO authenticated
      USING (
        public.current_user_is_admin()
        OR auth.uid()::text = ANY (
          COALESCE(
            ARRAY(SELECT unnest(group_ids)::text),
            ARRAY[]::text[]
          )
        )
        OR (
          public.current_user_group_id() IS NOT NULL
          AND public.current_user_group_id()::text = ANY (
            COALESCE(
              ARRAY(SELECT unnest(group_ids)::text),
              ARRAY[]::text[]
            )
          )
        )
      );
    END IF;
  ELSE
    RAISE NOTICE 'public.group_pricing does not exist, skipping self-group select hotfix.';
  END IF;
END $$;

-- Ensure PostgREST sees policy updates immediately.
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE 'group_pricing self-group select policy hotfix applied';
END $$;

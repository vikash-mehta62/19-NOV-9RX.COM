-- Hotfix: allow authenticated pharmacies/groups to read only their applicable
-- special pricing rules, while keeping admin full visibility via admin policy.

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

ALTER TABLE public.group_pricing ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE public.group_pricing TO authenticated;

DROP POLICY IF EXISTS group_pricing_authenticated_select_self_or_group ON public.group_pricing;
CREATE POLICY group_pricing_authenticated_select_self_or_group
ON public.group_pricing
FOR SELECT
TO authenticated
USING (
  public.current_user_is_admin()
  OR (
    auth.uid() IS NOT NULL
    AND (
      COALESCE(to_jsonb(group_ids), '[]'::jsonb) @> jsonb_build_array(auth.uid()::text)
      OR (
        public.current_user_group_id() IS NOT NULL
        AND COALESCE(to_jsonb(group_ids), '[]'::jsonb) @> jsonb_build_array(public.current_user_group_id()::text)
      )
    )
  )
);

-- Ensure PostgREST picks up policy changes immediately.
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE 'group_pricing self/group select policy hotfix applied';
END $$;

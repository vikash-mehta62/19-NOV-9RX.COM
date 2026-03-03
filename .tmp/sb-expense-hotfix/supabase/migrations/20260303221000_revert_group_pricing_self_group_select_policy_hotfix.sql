-- Revert policy added by 20260303220000_group_pricing_self_group_select_policy_hotfix
DROP POLICY IF EXISTS group_pricing_authenticated_select_self_or_group ON public.group_pricing;
NOTIFY pgrst, 'reload schema';
DO $$
BEGIN
  RAISE NOTICE 'reverted group_pricing self/group select policy hotfix';
END $$;

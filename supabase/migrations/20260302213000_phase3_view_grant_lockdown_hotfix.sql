-- Phase 3b Hotfix: Lock down anon/public access on public views
-- Reason: previous lockdown handled base tables; views remained with historical grants.
-- Safe to run multiple times.

DO $$
DECLARE
  v RECORD;
BEGIN
  FOR v IN
    SELECT table_name
    FROM information_schema.views
    WHERE table_schema = 'public'
  LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon', v.table_name);
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC', v.table_name);
  END LOOP;
END $$;

DO $$
DECLARE
  mv RECORD;
BEGIN
  FOR mv IN
    SELECT matviewname
    FROM pg_matviews
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon', mv.matviewname);
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC', mv.matviewname);
  END LOOP;
END $$;

DO $$
DECLARE
  v_bad_view_grants INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_bad_view_grants
  FROM information_schema.table_privileges tp
  JOIN information_schema.views v
    ON v.table_schema = tp.table_schema
   AND v.table_name = tp.table_name
  WHERE tp.table_schema = 'public'
    AND lower(tp.grantee) IN ('anon', 'public');

  IF v_bad_view_grants > 0 THEN
    RAISE EXCEPTION 'Phase 3b verification failed: anon/public grants still present on public views (% rows)', v_bad_view_grants;
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE 'Phase 3b view grant lockdown applied successfully.';
END $$;

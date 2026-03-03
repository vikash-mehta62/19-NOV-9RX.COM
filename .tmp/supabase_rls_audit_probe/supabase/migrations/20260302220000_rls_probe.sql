DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE 'SUMMARY|tables=%|rls_enabled=%|rls_disabled=%|policies=%|public_role_policies=%|unconditional_policies=%|anon_table_grants=%|anon_function_grants=%',
    (SELECT COUNT(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r'),
    (SELECT COUNT(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity),
    (SELECT COUNT(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity),
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname='public'),
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname='public' AND roles::text ILIKE '%public%'),
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname='public' AND (lower(trim(COALESCE(qual,''))) IN ('true','(true)') OR lower(trim(COALESCE(with_check,''))) IN ('true','(true)'))),
    (SELECT COUNT(*) FROM information_schema.table_privileges WHERE table_schema='public' AND grantee='anon'),
    (SELECT COUNT(*) FROM information_schema.role_routine_grants WHERE specific_schema='public' AND grantee='anon');

  FOR r IN
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity
    ORDER BY c.relname
  LOOP
    RAISE NOTICE 'RLS_DISABLED|table=%', r.table_name;
  END LOOP;

  FOR r IN
    SELECT table_name, grantee, string_agg(privilege_type, ',' ORDER BY privilege_type) AS privs
    FROM information_schema.table_privileges
    WHERE table_schema='public' AND grantee IN ('anon','authenticated','public')
    GROUP BY table_name, grantee
    ORDER BY table_name, grantee
  LOOP
    RAISE NOTICE 'TABLE_GRANT|table=%|grantee=%|privs=%', r.table_name, r.grantee, r.privs;
  END LOOP;

  FOR r IN
    SELECT tablename, policyname, cmd, roles::text AS roles_text,
           LEFT(REPLACE(regexp_replace(COALESCE(qual,''), '\s+', ' ', 'g'),'|','/'),180) AS qual_text,
           LEFT(REPLACE(regexp_replace(COALESCE(with_check,''), '\s+', ' ', 'g'),'|','/'),180) AS check_text
    FROM pg_policies
    WHERE schemaname='public'
      AND (
        roles::text ILIKE '%public%'
        OR roles::text ILIKE '%anon%'
        OR lower(trim(COALESCE(qual,''))) IN ('true','(true)')
        OR lower(trim(COALESCE(with_check,''))) IN ('true','(true)')
      )
    ORDER BY tablename, policyname
  LOOP
    RAISE NOTICE 'RISK_POLICY|table=%|policy=%|cmd=%|roles=%|qual=%|check=%',
      r.tablename, r.policyname, r.cmd, r.roles_text, r.qual_text, r.check_text;
  END LOOP;

  FOR r IN
    SELECT p.proname,
           pg_get_function_identity_arguments(p.oid) AS args,
           p.prosecdef AS is_definer,
           has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec,
           has_function_privilege('public', p.oid, 'EXECUTE') AS public_exec,
           has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public'
      AND p.prosecdef
    ORDER BY p.proname
  LOOP
    RAISE NOTICE 'DEFINER_FUNC|name=%|args=%|anon_exec=%|public_exec=%|auth_exec=%', r.proname, r.args, r.anon_exec, r.public_exec, r.auth_exec;
  END LOOP;

  RAISE EXCEPTION 'RLS_AUDIT_COMPLETE';
END $$;

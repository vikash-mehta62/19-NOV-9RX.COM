-- Hotfix: restore authenticated/admin access for admin customer profile tabs
-- Context:
-- - Global policy hardening removed legacy TO public policies.
-- - Admin profile modal tabs started failing for notes/tasks/documents.
-- - Customer self document uploads also started failing.

-- Ensure helper exists
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

DO $$
BEGIN
  -- -------------------------------------------------------------------------
  -- customer_notes (admin manage)
  -- -------------------------------------------------------------------------
  IF to_regclass('public.customer_notes') IS NOT NULL THEN
    ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.customer_notes TO authenticated;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'customer_notes'
        AND policyname = 'customer_notes_admin_select'
    ) THEN
      CREATE POLICY customer_notes_admin_select
      ON public.customer_notes
      FOR SELECT
      TO authenticated
      USING (public.current_user_is_admin());
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'customer_notes'
        AND policyname = 'customer_notes_admin_insert'
    ) THEN
      CREATE POLICY customer_notes_admin_insert
      ON public.customer_notes
      FOR INSERT
      TO authenticated
      WITH CHECK (public.current_user_is_admin());
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'customer_notes'
        AND policyname = 'customer_notes_admin_update'
    ) THEN
      CREATE POLICY customer_notes_admin_update
      ON public.customer_notes
      FOR UPDATE
      TO authenticated
      USING (public.current_user_is_admin())
      WITH CHECK (public.current_user_is_admin());
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'customer_notes'
        AND policyname = 'customer_notes_admin_delete'
    ) THEN
      CREATE POLICY customer_notes_admin_delete
      ON public.customer_notes
      FOR DELETE
      TO authenticated
      USING (public.current_user_is_admin());
    END IF;
  END IF;

  -- -------------------------------------------------------------------------
  -- customer_tasks (admin manage)
  -- -------------------------------------------------------------------------
  IF to_regclass('public.customer_tasks') IS NOT NULL THEN
    ALTER TABLE public.customer_tasks ENABLE ROW LEVEL SECURITY;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.customer_tasks TO authenticated;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'customer_tasks'
        AND policyname = 'customer_tasks_admin_select'
    ) THEN
      CREATE POLICY customer_tasks_admin_select
      ON public.customer_tasks
      FOR SELECT
      TO authenticated
      USING (public.current_user_is_admin());
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'customer_tasks'
        AND policyname = 'customer_tasks_admin_insert'
    ) THEN
      CREATE POLICY customer_tasks_admin_insert
      ON public.customer_tasks
      FOR INSERT
      TO authenticated
      WITH CHECK (public.current_user_is_admin());
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'customer_tasks'
        AND policyname = 'customer_tasks_admin_update'
    ) THEN
      CREATE POLICY customer_tasks_admin_update
      ON public.customer_tasks
      FOR UPDATE
      TO authenticated
      USING (public.current_user_is_admin())
      WITH CHECK (public.current_user_is_admin());
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'customer_tasks'
        AND policyname = 'customer_tasks_admin_delete'
    ) THEN
      CREATE POLICY customer_tasks_admin_delete
      ON public.customer_tasks
      FOR DELETE
      TO authenticated
      USING (public.current_user_is_admin());
    END IF;
  END IF;

  -- -------------------------------------------------------------------------
  -- customer_documents (admin + self manage)
  -- -------------------------------------------------------------------------
  IF to_regclass('public.customer_documents') IS NOT NULL THEN
    ALTER TABLE public.customer_documents ENABLE ROW LEVEL SECURITY;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.customer_documents TO authenticated;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'customer_documents'
        AND policyname = 'customer_documents_self_or_admin_select'
    ) THEN
      CREATE POLICY customer_documents_self_or_admin_select
      ON public.customer_documents
      FOR SELECT
      TO authenticated
      USING (customer_id = auth.uid() OR public.current_user_is_admin());
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'customer_documents'
        AND policyname = 'customer_documents_self_or_admin_insert'
    ) THEN
      CREATE POLICY customer_documents_self_or_admin_insert
      ON public.customer_documents
      FOR INSERT
      TO authenticated
      WITH CHECK (customer_id = auth.uid() OR public.current_user_is_admin());
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'customer_documents'
        AND policyname = 'customer_documents_self_or_admin_update'
    ) THEN
      CREATE POLICY customer_documents_self_or_admin_update
      ON public.customer_documents
      FOR UPDATE
      TO authenticated
      USING (customer_id = auth.uid() OR public.current_user_is_admin())
      WITH CHECK (customer_id = auth.uid() OR public.current_user_is_admin());
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'customer_documents'
        AND policyname = 'customer_documents_self_or_admin_delete'
    ) THEN
      CREATE POLICY customer_documents_self_or_admin_delete
      ON public.customer_documents
      FOR DELETE
      TO authenticated
      USING (customer_id = auth.uid() OR public.current_user_is_admin());
    END IF;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- storage.objects documents bucket (admin + self path access)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('storage.objects') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'documents_bucket_authenticated_insert_self_or_admin'
    ) THEN
      CREATE POLICY documents_bucket_authenticated_insert_self_or_admin
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'documents'
        AND (
          name LIKE 'user-documents/' || auth.uid()::text || '/%'
          OR name LIKE 'customer-documents/' || auth.uid()::text || '/%'
          OR public.current_user_is_admin()
        )
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'documents_bucket_authenticated_select_self_or_admin'
    ) THEN
      CREATE POLICY documents_bucket_authenticated_select_self_or_admin
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'documents'
        AND (
          name LIKE 'user-documents/' || auth.uid()::text || '/%'
          OR name LIKE 'customer-documents/' || auth.uid()::text || '/%'
          OR public.current_user_is_admin()
        )
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'documents_bucket_authenticated_update_self_or_admin'
    ) THEN
      CREATE POLICY documents_bucket_authenticated_update_self_or_admin
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'documents'
        AND (
          name LIKE 'user-documents/' || auth.uid()::text || '/%'
          OR name LIKE 'customer-documents/' || auth.uid()::text || '/%'
          OR public.current_user_is_admin()
        )
      )
      WITH CHECK (
        bucket_id = 'documents'
        AND (
          name LIKE 'user-documents/' || auth.uid()::text || '/%'
          OR name LIKE 'customer-documents/' || auth.uid()::text || '/%'
          OR public.current_user_is_admin()
        )
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'documents_bucket_authenticated_delete_self_or_admin'
    ) THEN
      CREATE POLICY documents_bucket_authenticated_delete_self_or_admin
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'documents'
        AND (
          name LIKE 'user-documents/' || auth.uid()::text || '/%'
          OR name LIKE 'customer-documents/' || auth.uid()::text || '/%'
          OR public.current_user_is_admin()
        )
      );
    END IF;
  END IF;
END $$;

-- Ensure PostgREST sees policy changes immediately.
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE 'admin profile tabs RLS hotfix applied (notes/tasks/customer_documents + documents bucket)';
END $$;


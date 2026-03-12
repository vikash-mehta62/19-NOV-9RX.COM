CREATE TABLE IF NOT EXISTS public.po_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  url TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_po_documents_order_id
ON public.po_documents(order_id);

ALTER TABLE public.po_documents ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON public.po_documents TO authenticated;

DROP POLICY IF EXISTS po_documents_select_self_or_admin ON public.po_documents;
CREATE POLICY po_documents_select_self_or_admin
ON public.po_documents
FOR SELECT
TO authenticated
USING (
  public.current_user_is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = po_documents.order_id
      AND o.profile_id = auth.uid()
  )
);

DROP POLICY IF EXISTS po_documents_insert_self_or_admin ON public.po_documents;
CREATE POLICY po_documents_insert_self_or_admin
ON public.po_documents
FOR INSERT
TO authenticated
WITH CHECK (
  public.current_user_is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = po_documents.order_id
      AND o.profile_id = auth.uid()
  )
);

DROP POLICY IF EXISTS po_documents_delete_self_or_admin ON public.po_documents;
CREATE POLICY po_documents_delete_self_or_admin
ON public.po_documents
FOR DELETE
TO authenticated
USING (
  public.current_user_is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = po_documents.order_id
      AND o.profile_id = auth.uid()
  )
);

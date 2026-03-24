CREATE TABLE IF NOT EXISTS public.customer_document_reminder_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_document_id uuid NOT NULL REFERENCES public.customer_documents(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reminder_type text NOT NULL CHECK (reminder_type IN ('missing_expiry', 'expiring_soon', 'expired')),
  reminder_window_days integer,
  sent_via_email boolean DEFAULT false,
  sent_via_notification boolean DEFAULT false,
  sent_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_customer_document_reminder_logs_document
  ON public.customer_document_reminder_logs(customer_document_id, reminder_type, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_document_reminder_logs_customer
  ON public.customer_document_reminder_logs(customer_id, sent_at DESC);

ALTER TABLE public.customer_document_reminder_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_document_reminder_logs_admin_select ON public.customer_document_reminder_logs;
CREATE POLICY customer_document_reminder_logs_admin_select
ON public.customer_document_reminder_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
  )
);

DROP POLICY IF EXISTS customer_document_reminder_logs_admin_insert ON public.customer_document_reminder_logs;
CREATE POLICY customer_document_reminder_logs_admin_insert
ON public.customer_document_reminder_logs
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
  )
);

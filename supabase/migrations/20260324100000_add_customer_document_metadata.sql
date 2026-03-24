ALTER TABLE public.customer_documents
ADD COLUMN IF NOT EXISTS document_category text DEFAULT 'other',
ADD COLUMN IF NOT EXISTS document_number text,
ADD COLUMN IF NOT EXISTS issued_at date,
ADD COLUMN IF NOT EXISTS expires_at date,
ADD COLUMN IF NOT EXISTS reminder_days_before integer DEFAULT 30;

UPDATE public.customer_documents
SET document_category = 'other'
WHERE document_category IS NULL;

ALTER TABLE public.customer_documents
ALTER COLUMN document_category SET DEFAULT 'other';

CREATE INDEX IF NOT EXISTS idx_customer_documents_expires_at
  ON public.customer_documents(expires_at);

CREATE INDEX IF NOT EXISTS idx_customer_documents_category
  ON public.customer_documents(document_category);

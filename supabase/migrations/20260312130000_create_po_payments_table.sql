CREATE TABLE IF NOT EXISTS public.po_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  payment_date DATE NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'manual',
  reference TEXT,
  note TEXT,
  expense_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_po_payments_order_id
ON public.po_payments(order_id);

CREATE INDEX IF NOT EXISTS idx_po_payments_created_at
ON public.po_payments(created_at DESC);

ALTER TABLE public.po_payments ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.po_payments TO authenticated;

DROP POLICY IF EXISTS po_payments_select_self_or_admin ON public.po_payments;
CREATE POLICY po_payments_select_self_or_admin
ON public.po_payments
FOR SELECT
TO authenticated
USING (
  public.current_user_is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = po_payments.order_id
      AND o.profile_id = auth.uid()
  )
);

DROP POLICY IF EXISTS po_payments_insert_self_or_admin ON public.po_payments;
CREATE POLICY po_payments_insert_self_or_admin
ON public.po_payments
FOR INSERT
TO authenticated
WITH CHECK (
  public.current_user_is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = po_payments.order_id
      AND o.profile_id = auth.uid()
  )
);

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS payment_notes TEXT;

COMMENT ON COLUMN public.orders.payment_notes IS
'Freeform payment notes for orders and purchase orders.';

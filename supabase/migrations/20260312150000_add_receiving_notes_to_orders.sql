ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS receiving_notes TEXT;

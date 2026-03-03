-- Inventory schema hardening for environments missing phase SQL scripts.
-- Safe to run multiple times.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- inventory_transactions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL,
  type TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  previous_stock NUMERIC NOT NULL DEFAULT 0,
  new_stock NUMERIC NOT NULL DEFAULT 0,
  reference_id UUID,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.inventory_transactions
  ADD COLUMN IF NOT EXISTS product_id UUID,
  ADD COLUMN IF NOT EXISTS type TEXT,
  ADD COLUMN IF NOT EXISTS quantity NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS previous_stock NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS new_stock NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reference_id UUID,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'inventory_transactions_product_id_fkey'
  ) THEN
    ALTER TABLE public.inventory_transactions
      ADD CONSTRAINT inventory_transactions_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product_id
  ON public.inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at
  ON public.inventory_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type
  ON public.inventory_transactions(type);

-- ---------------------------------------------------------------------------
-- product_batches (supports both legacy and size-level inventory flows)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL,
  product_size_id UUID,
  batch_number TEXT NOT NULL,
  lot_number TEXT,
  manufacturing_date DATE,
  expiry_date DATE,
  quantity NUMERIC NOT NULL DEFAULT 0,
  quantity_available NUMERIC NOT NULL DEFAULT 0,
  cost_per_unit NUMERIC,
  supplier_id UUID,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  received_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.product_batches
  ADD COLUMN IF NOT EXISTS product_id UUID,
  ADD COLUMN IF NOT EXISTS product_size_id UUID,
  ADD COLUMN IF NOT EXISTS batch_number TEXT,
  ADD COLUMN IF NOT EXISTS lot_number TEXT,
  ADD COLUMN IF NOT EXISTS manufacturing_date DATE,
  ADD COLUMN IF NOT EXISTS expiry_date DATE,
  ADD COLUMN IF NOT EXISTS quantity NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantity_available NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_per_unit NUMERIC,
  ADD COLUMN IF NOT EXISTS supplier_id UUID,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS received_date TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.product_batches
SET quantity_available = COALESCE(quantity, 0)
WHERE quantity_available IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'product_batches_product_id_fkey'
  ) THEN
    ALTER TABLE public.product_batches
      ADD CONSTRAINT product_batches_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'product_batches_product_size_id_fkey'
  ) THEN
    ALTER TABLE public.product_batches
      ADD CONSTRAINT product_batches_product_size_id_fkey
      FOREIGN KEY (product_size_id) REFERENCES public.product_sizes(id) ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_batches_unique
  ON public.product_batches(product_id, batch_number, lot_number);
CREATE INDEX IF NOT EXISTS idx_product_batches_product_id
  ON public.product_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_product_batches_product_size_id
  ON public.product_batches(product_size_id);
CREATE INDEX IF NOT EXISTS idx_product_batches_status
  ON public.product_batches(status);
CREATE INDEX IF NOT EXISTS idx_product_batches_expiry_date
  ON public.product_batches(expiry_date);

-- ---------------------------------------------------------------------------
-- batch_transactions (used by batchInventoryService)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.batch_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL,
  transaction_type TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  reference_id UUID,
  reference_type TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.batch_transactions
  ADD COLUMN IF NOT EXISTS batch_id UUID,
  ADD COLUMN IF NOT EXISTS transaction_type TEXT,
  ADD COLUMN IF NOT EXISTS quantity NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reference_id UUID,
  ADD COLUMN IF NOT EXISTS reference_type TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'batch_transactions_batch_id_fkey'
  ) THEN
    ALTER TABLE public.batch_transactions
      ADD CONSTRAINT batch_transactions_batch_id_fkey
      FOREIGN KEY (batch_id) REFERENCES public.product_batches(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_batch_transactions_batch_id
  ON public.batch_transactions(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_transactions_created_at
  ON public.batch_transactions(created_at DESC);

-- ---------------------------------------------------------------------------
-- batch_movements (used by batchTrackingService)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.batch_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL,
  movement_type TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  reference_id UUID,
  reference_type TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.batch_movements
  ADD COLUMN IF NOT EXISTS batch_id UUID,
  ADD COLUMN IF NOT EXISTS movement_type TEXT,
  ADD COLUMN IF NOT EXISTS quantity NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reference_id UUID,
  ADD COLUMN IF NOT EXISTS reference_type TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'batch_movements_batch_id_fkey'
  ) THEN
    ALTER TABLE public.batch_movements
      ADD CONSTRAINT batch_movements_batch_id_fkey
      FOREIGN KEY (batch_id) REFERENCES public.product_batches(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_batch_movements_batch_id
  ON public.batch_movements(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_movements_created_at
  ON public.batch_movements(created_at DESC);

-- ---------------------------------------------------------------------------
-- RPC helpers used by services
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.deduct_batch_quantity(UUID, NUMERIC);
DROP FUNCTION IF EXISTS public.update_batch_quantity(UUID, NUMERIC);
DROP FUNCTION IF EXISTS public.get_available_batches_fefo(UUID);
DROP FUNCTION IF EXISTS public.get_expiring_batches(INTEGER);

CREATE OR REPLACE FUNCTION public.deduct_batch_quantity(
  p_batch_id UUID,
  p_quantity NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  current_qty NUMERIC;
BEGIN
  SELECT COALESCE(quantity_available, 0)
  INTO current_qty
  FROM public.product_batches
  WHERE id = p_batch_id
  FOR UPDATE;

  IF current_qty < p_quantity THEN
    RAISE EXCEPTION 'Insufficient quantity_available. Current: %, Requested: %', current_qty, p_quantity;
  END IF;

  UPDATE public.product_batches
  SET
    quantity_available = GREATEST(0, current_qty - p_quantity),
    status = CASE
      WHEN GREATEST(0, current_qty - p_quantity) = 0 THEN 'depleted'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = p_batch_id;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_batch_quantity(
  p_batch_id UUID,
  p_quantity_change NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  current_qty NUMERIC;
  updated_qty NUMERIC;
BEGIN
  SELECT COALESCE(quantity, 0)
  INTO current_qty
  FROM public.product_batches
  WHERE id = p_batch_id
  FOR UPDATE;

  updated_qty := GREATEST(0, current_qty + p_quantity_change);

  UPDATE public.product_batches
  SET
    quantity = updated_qty,
    quantity_available = CASE
      WHEN quantity_available IS NULL THEN updated_qty
      ELSE GREATEST(0, quantity_available + p_quantity_change)
    END,
    status = CASE
      WHEN updated_qty = 0 THEN 'depleted'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = p_batch_id;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_available_batches_fefo(
  p_product_id UUID
)
RETURNS TABLE (
  id UUID,
  product_id UUID,
  batch_number TEXT,
  lot_number TEXT,
  manufacturing_date DATE,
  expiry_date DATE,
  quantity NUMERIC,
  cost_per_unit NUMERIC,
  supplier_id UUID,
  status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
AS $$
  SELECT
    pb.id,
    pb.product_id,
    pb.batch_number,
    pb.lot_number,
    pb.manufacturing_date,
    pb.expiry_date,
    pb.quantity,
    pb.cost_per_unit,
    pb.supplier_id,
    pb.status,
    pb.notes,
    pb.created_at,
    pb.updated_at
  FROM public.product_batches pb
  WHERE pb.product_id = p_product_id
    AND pb.status = 'active'
    AND COALESCE(pb.quantity, 0) > 0
    AND (pb.expiry_date IS NULL OR pb.expiry_date >= CURRENT_DATE)
  ORDER BY pb.expiry_date ASC NULLS LAST, pb.received_date ASC;
$$;

CREATE OR REPLACE FUNCTION public.get_expiring_batches(
  days_threshold INTEGER DEFAULT 30
)
RETURNS TABLE (
  batch_id UUID,
  product_id UUID,
  product_name TEXT,
  batch_number TEXT,
  lot_number TEXT,
  expiry_date DATE,
  days_until_expiry INTEGER,
  quantity NUMERIC,
  status TEXT
)
LANGUAGE sql
AS $$
  SELECT
    pb.id AS batch_id,
    pb.product_id,
    p.name AS product_name,
    pb.batch_number,
    pb.lot_number,
    pb.expiry_date,
    (pb.expiry_date - CURRENT_DATE) AS days_until_expiry,
    pb.quantity,
    pb.status
  FROM public.product_batches pb
  JOIN public.products p ON p.id = pb.product_id
  WHERE pb.status = 'active'
    AND pb.expiry_date IS NOT NULL
    AND pb.expiry_date <= CURRENT_DATE + days_threshold
    AND COALESCE(pb.quantity, 0) > 0
  ORDER BY pb.expiry_date ASC;
$$;

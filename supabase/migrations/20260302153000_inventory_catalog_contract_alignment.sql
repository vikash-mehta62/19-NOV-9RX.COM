-- Align live DB contracts with product/inventory app behavior.
-- Safe to run multiple times.

-- ---------------------------------------------------------------------------
-- inventory_transactions: align accepted type values with app writes.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.inventory_transactions') IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.inventory_transactions
  SET type = 'purchase'
  WHERE type = 'receipt';

  UPDATE public.inventory_transactions
  SET type = 'damage'
  WHERE type = 'damaged';

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'inventory_transactions_type_check'
      AND conrelid = 'public.inventory_transactions'::regclass
  ) THEN
    ALTER TABLE public.inventory_transactions
      DROP CONSTRAINT inventory_transactions_type_check;
  END IF;

  ALTER TABLE public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_type_check
    CHECK (
      type = ANY (
        ARRAY[
          'sale',
          'purchase',
          'receipt',
          'adjustment',
          'return',
          'transfer',
          'restoration',
          'damage',
          'expired',
          'theft'
        ]
      )
    ) NOT VALID;
END $$;

-- ---------------------------------------------------------------------------
-- product_batches: keep expiry optional (UI allows it to be empty).
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.product_batches') IS NULL THEN
    RETURN;
  END IF;

  ALTER TABLE public.product_batches
    ALTER COLUMN expiry_date DROP NOT NULL;
END $$;

-- ---------------------------------------------------------------------------
-- subcategory_configs: repair/standardize autoincrement id behavior.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  id_data_type TEXT;
  next_id BIGINT;
BEGIN
  IF to_regclass('public.subcategory_configs') IS NULL THEN
    RETURN;
  END IF;

  SELECT data_type
  INTO id_data_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'subcategory_configs'
    AND column_name = 'id';

  IF id_data_type NOT IN ('smallint', 'integer', 'bigint') THEN
    RETURN;
  END IF;

  IF to_regclass('public.subcategory_configs_id_seq') IS NULL THEN
    CREATE SEQUENCE public.subcategory_configs_id_seq;
  END IF;

  ALTER TABLE public.subcategory_configs
    ALTER COLUMN id SET DEFAULT nextval('public.subcategory_configs_id_seq'::regclass);

  ALTER SEQUENCE public.subcategory_configs_id_seq
    OWNED BY public.subcategory_configs.id;

  SELECT COALESCE(MAX(id), 0) + 1
  INTO next_id
  FROM public.subcategory_configs;

  PERFORM setval('public.subcategory_configs_id_seq', next_id, false);
END $$;

-- Ensure consistent ordering columns for product category tree.
-- Idempotent migration: safe to run multiple times.

ALTER TABLE IF EXISTS public.category_configs
  ADD COLUMN IF NOT EXISTS display_order INTEGER;

UPDATE public.category_configs c
SET display_order = ordered.seq
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY category_name) AS seq
  FROM public.category_configs
  WHERE display_order IS NULL
) ordered
WHERE c.id = ordered.id;

ALTER TABLE IF EXISTS public.category_configs
  ALTER COLUMN display_order SET DEFAULT 999;

CREATE INDEX IF NOT EXISTS idx_category_configs_display_order
  ON public.category_configs(display_order, category_name);

ALTER TABLE IF EXISTS public.subcategory_configs
  ADD COLUMN IF NOT EXISTS display_order INTEGER;

UPDATE public.subcategory_configs s
SET display_order = ordered.seq
FROM (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY category_name ORDER BY subcategory_name) AS seq
  FROM public.subcategory_configs
  WHERE display_order IS NULL
) ordered
WHERE s.id = ordered.id;

ALTER TABLE IF EXISTS public.subcategory_configs
  ALTER COLUMN display_order SET DEFAULT 999;

CREATE INDEX IF NOT EXISTS idx_subcategory_configs_display_order
  ON public.subcategory_configs(category_name, display_order, subcategory_name);

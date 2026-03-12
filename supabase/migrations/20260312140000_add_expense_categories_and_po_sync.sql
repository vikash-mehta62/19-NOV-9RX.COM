ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'other_expense';

ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS source_type TEXT;

ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS source_id UUID;

ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS source_subtype TEXT;

CREATE INDEX IF NOT EXISTS idx_expenses_category
ON public.expenses(category);

CREATE INDEX IF NOT EXISTS idx_expenses_source_lookup
ON public.expenses(source_type, source_id, source_subtype);

CREATE UNIQUE INDEX IF NOT EXISTS idx_expenses_source_unique
ON public.expenses(source_type, source_id, source_subtype)
WHERE source_type IS NOT NULL
  AND source_id IS NOT NULL
  AND source_subtype IS NOT NULL;
